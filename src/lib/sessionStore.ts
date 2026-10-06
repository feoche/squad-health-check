import {
  DataSnapshot,
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { Ballot, Category, ClientSessionState, FacilitatorNote, SessionSettings, Vote } from '../types';
import { ensureSignedIn, getDb } from './firebase';
import { generateSessionCode, randomKey } from './sessionCode';
import { MAX_PARTICIPANTS, freeSlots } from './participantSlots';
import { t } from './i18n';
import { DEFAULT_CATEGORY_MINUTES } from './roundTimer';
import { toFirebaseCategories } from './serialize';
import {
  RawSession,
  at,
  deriveClientState,
  readableBallotIndexes,
  readableVoteIndexes,
} from './deriveClientState';

type Unsubscribe = () => void;

const sessionRef = (code: string, path = '') =>
  ref(getDb(), `sessions/${code}${path ? `/${path}` : ''}`);

function isPermissionDenied(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined;
  return /permission.denied/i.test(`${e?.code ?? ''} ${e?.message ?? ''}`);
}

/** An error worded by the app; its text is read when shown, in the language of the moment */
export class AppError extends Error {
  constructor(readonly text: () => string) {
    super(text());
  }
}

export function describeError(err: unknown): string {
  if (err instanceof AppError) return err.text();
  if (isPermissionDenied(err)) return t.errors.notAllowed;
  if (err instanceof Error) return err.message;
  return t.errors.generic;
}

/* ─── Create / join ─── */

const MAX_CODE_ATTEMPTS = 3;

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  facilitatorVotes: true,
  anonymity: 'off',
  categoryMinutes: DEFAULT_CATEGORY_MINUTES,
};

/** Settings are written once here: the rules refuse any later change */
export async function createSession(categories: Category[], settings: SessionSettings): Promise<string> {
  const uid = await ensureSignedIn();
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateSessionCode();
    try {
      await update(sessionRef(code), {
        meta: {
          facilitatorId: uid,
          categories: toFirebaseCategories(categories),
          createdAt: serverTimestamp(),
        },
        state: { phase: 'lobby', currentCategoryIndex: 0, ...settings },
      });
      return code;
    } catch (err) {
      /* Rules deny writing meta of an existing session → code collision, retry */
      if (!isPermissionDenied(err)) throw err;
    }
  }
  throw new AppError(() => t.errors.createFailed);
}

export async function sessionExists(code: string): Promise<boolean> {
  await ensureSignedIn();
  const snap = await get(sessionRef(code, 'meta/facilitatorId'));
  return snap.exists();
}

export async function getParticipantName(code: string, uid: string): Promise<string | null> {
  const snap = await get(sessionRef(code, `participants/${uid}/name`));
  return snap.exists() ? (snap.val() as string) : null;
}

/**
 * Claims a free slot together with the participant entry; rules make slots write-once,
 * so at most MAX_PARTICIPANTS can ever join. A denied claim means someone took that slot first.
 */
export async function joinSession(code: string, uid: string, name: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_PARTICIPANTS; attempt++) {
    const [slot] = freeSlots((await get(sessionRef(code, 'slots'))).val());
    if (slot === undefined) throw new AppError(() => t.errors.sessionFull(MAX_PARTICIPANTS));
    try {
      await update(sessionRef(code), {
        [`slots/${slot}`]: uid,
        [`participants/${uid}`]: { name, slot },
      });
      return;
    } catch (err) {
      if (!isPermissionDenied(err)) throw err;
    }
  }
  throw new AppError(() => t.errors.generic);
}

/* ─── Subscriptions ─── */

export function subscribeSession(
  code: string,
  uid: string,
  onState: (s: ClientSessionState) => void,
): Unsubscribe {
  const raw: RawSession = {
    meta: null,
    state: null,
    participants: null,
    voters: null,
    votes: {},
    facilitator: undefined,
    closed: null,
    ballots: {},
    roundBallots: {},
  };
  const unsubs: Unsubscribe[] = [];
  const voteUnsubs = new Map<number, Unsubscribe>();
  const roundBallotUnsubs = new Map<number, Unsubscribe>();
  let ballotListener: { index: number; unsubscribe: Unsubscribe } | null = null;
  let facilitatorListening = false;

  const isFacilitator = () => raw.meta?.facilitatorId === uid;

  const emit = () => {
    const state = deriveClientState(code, raw, uid);
    if (state) onState(state);
  };

  const warnCancelled = (path: string) => (err: Error) =>
    console.warn(`[session] listener on ${path} cancelled`, err);

  /* Attach vote listeners only where the rules allow reading (see readableVoteIndexes) */
  const syncVoteListeners = () => {
    if (!raw.meta || !raw.state) return;
    const readable = readableVoteIndexes(
      raw.state,
      raw.meta.categories.length,
      raw.closed,
      isFacilitator(),
      Boolean(at(raw.voters, raw.state.currentCategoryIndex)?.[uid]),
    );
    for (const i of readable) {
      if (voteUnsubs.has(i)) continue;
      voteUnsubs.set(
        i,
        onValue(
          sessionRef(code, `votes/${i}`),
          (snap: DataSnapshot) => {
            (raw.votes as Record<string, Record<string, Vote>>)[String(i)] = snap.val() ?? {};
            emit();
          },
          (err: Error) => {
            // Unexpected for the facilitator: keep cached data and allow re-attaching on the next sync
            voteUnsubs.delete(i);
            warnCancelled(`votes/${i}`)(err);
          },
        ),
      );
    }
  };

  /* Everyone's ballots, in sessions that are not fully anonymous and only where the rules allow */
  const syncRoundBallotListeners = () => {
    // Only the facilitator's views and the presenter window (signed in as the facilitator) render results
    if (!isFacilitator()) return;
    if (!raw.meta || !raw.state) return;
    const readable = readableBallotIndexes(
      raw.state,
      raw.meta.categories.length,
      raw.closed,
      isFacilitator(),
    );
    for (const i of readable) {
      if (roundBallotUnsubs.has(i)) continue;
      roundBallotUnsubs.set(
        i,
        onValue(
          sessionRef(code, `ballots/${i}`),
          (snap: DataSnapshot) => {
            raw.roundBallots[String(i)] = snap.val() as Record<string, Ballot> | null;
            emit();
          },
          (err: Error) => {
            // Expected for participants once the round is closed: keep cached data, re-attach when finished
            roundBallotUnsubs.delete(i);
            warnCancelled(`ballots/${i}`)(err);
          },
        ),
      );
    }
  };

  /* Only the round being voted matters: a ballot can't be edited once the round is over */
  const syncBallotListener = () => {
    const index = raw.state?.currentCategoryIndex;
    if (index === undefined || ballotListener?.index === index) return;
    ballotListener?.unsubscribe();
    ballotListener = {
      index,
      unsubscribe: onValue(
        sessionRef(code, `ballots/${index}/${uid}`),
        (snap: DataSnapshot) => {
          raw.ballots[String(index)] = snap.val() as Ballot | null;
          emit();
        },
        warnCancelled(`ballots/${index}`),
      ),
    };
  };

  const listen = (key: 'meta' | 'state' | 'participants' | 'voters' | 'facilitator' | 'closed') => {
    unsubs.push(
      onValue(
        sessionRef(code, key),
        (snap: DataSnapshot) => {
          (raw as unknown as Record<string, unknown>)[key] = snap.val();
          if (key === 'meta') syncFacilitatorListeners();
          if (key === 'state') syncBallotListener();
          if (key !== 'participants' && key !== 'facilitator') {
            syncVoteListeners();
            syncRoundBallotListeners();
          }
          emit();
        },
        warnCancelled(key),
      ),
    );
  };

  /* Facilitator-only nodes: a participant's listener would be cancelled with PERMISSION_DENIED */
  const syncFacilitatorListeners = () => {
    if (facilitatorListening || !isFacilitator()) return;
    facilitatorListening = true;
    listen('facilitator');
    listen('closed');
  };

  listen('meta');
  listen('state');
  listen('participants');
  listen('voters');

  return () => {
    unsubs.forEach((u) => u());
    voteUnsubs.forEach((u) => u());
    roundBallotUnsubs.forEach((u) => u());
    ballotListener?.unsubscribe();
  };
}

/** Reports connection changes, but only after the first successful connection. */
export function subscribeConnection(onChange: (connected: boolean) => void): Unsubscribe {
  let seenOnline = false;
  return onValue(ref(getDb(), '.info/connected'), (snap) => {
    const online = snap.val() === true;
    if (online) seenOnline = true;
    if (seenOnline) onChange(online);
  });
}

/** Difference between the server clock and this device's, so every screen shows the same round time. */
export function subscribeServerTimeOffset(onChange: (offsetMs: number) => void): Unsubscribe {
  return onValue(ref(getDb(), '.info/serverTimeOffset'), (snap) => onChange(Number(snap.val()) || 0));
}

/* ─── Facilitator actions (guards mirror the former server) ─── */

const writeState = (s: ClientSessionState, patch: Record<string, unknown>) =>
  update(sessionRef(s.code, 'state'), patch);

export async function startWorkshop(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'lobby') return;
  await writeState(s, { phase: 'intro' });
}

export async function startVoting(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'intro') return;
  await writeState(s, { phase: 'voting', roundStartedAt: serverTimestamp() });
}

export async function revealVotes(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'voting') return;
  await writeState(s, { phase: 'revealed' });
}

/** Closing the round in the same write keeps the facilitator's vote listener readable. */
export async function nextCategory(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'revealed') return;
  const idx = s.currentCategoryIndex;
  if (idx >= s.categories.length - 1) return;
  await update(sessionRef(s.code), {
    'state/phase': 'voting',
    'state/currentCategoryIndex': idx + 1,
    'state/roundStartedAt': serverTimestamp(),
    [`closed/${idx}`]: true,
  });
}

export async function endSession(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator) return;
  await writeState(s, { phase: 'finished' });
}

export type NoteField = keyof FacilitatorNote;

export async function updateFacilitatorNote(
  s: ClientSessionState,
  categoryIndex: number,
  field: NoteField,
  value: string,
): Promise<void> {
  if (!s.isFacilitator) return;
  await set(sessionRef(s.code, `facilitator/${categoryIndex}/${field}`), value);
}

/* ─── Participant action ─── */

/**
 * Voter flag, anonymous vote and private ballot are written atomically; rules require them together.
 * Once voted, the ballot's key lets the voter overwrite their vote until the round is revealed.
 */
export async function submitVote(s: ClientSessionState, vote: Vote): Promise<void> {
  if (s.phase !== 'voting') return;
  const idx = s.currentCategoryIndex;
  const { color, trend } = vote;
  if (s.hasVoted) {
    const ballot = await get(sessionRef(s.code, `ballots/${idx}/${s.myId}`));
    if (!ballot.exists()) return;
    const { key } = ballot.val() as Ballot;
    await update(sessionRef(s.code), {
      [`votes/${idx}/${key}`]: { color, trend },
      [`ballots/${idx}/${s.myId}`]: { key, color, trend },
    });
    return;
  }
  const key = randomKey();
  await update(sessionRef(s.code), {
    [`voters/${idx}/${s.myId}`]: true,
    [`votes/${idx}/${key}`]: { color, trend },
    [`ballots/${idx}/${s.myId}`]: { key, color, trend },
  });
}

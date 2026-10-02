import {
  DataSnapshot,
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { Category, ClientSessionState, FacilitatorNote, Vote } from '../types';
import { ensureSignedIn, getDb } from './firebase';
import { generateSessionCode, randomKey } from './sessionCode';
import { toFirebaseCategories } from './serialize';
import { RawSession, deriveClientState, readableVoteIndexes } from './deriveClientState';

type Unsubscribe = () => void;

const sessionRef = (code: string, path = '') =>
  ref(getDb(), `sessions/${code}${path ? `/${path}` : ''}`);

function isPermissionDenied(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined;
  return /permission.denied/i.test(`${e?.code ?? ''} ${e?.message ?? ''}`);
}

export function describeError(err: unknown): string {
  if (isPermissionDenied(err)) return 'Not allowed — the session may have changed. Try reloading.';
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Check your connection and try again.';
}

/* ─── Create / join ─── */

const MAX_CODE_ATTEMPTS = 3;

export async function createSession(categories: Category[]): Promise<string> {
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
        state: { phase: 'lobby', currentCategoryIndex: 0 },
      });
      return code;
    } catch (err) {
      /* Rules deny writing meta of an existing session → code collision, retry */
      if (!isPermissionDenied(err)) throw err;
    }
  }
  throw new Error('Could not create a session. Please try again.');
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

export async function joinSession(code: string, uid: string, name: string): Promise<void> {
  await set(sessionRef(code, `participants/${uid}`), { name });
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
  };
  const unsubs: Unsubscribe[] = [];
  const voteUnsubs = new Map<number, Unsubscribe>();
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
            // Expected for participants once the round is closed: keep cached data, re-attach when finished
            voteUnsubs.delete(i);
            warnCancelled(`votes/${i}`)(err);
          },
        ),
      );
    }
  };

  const listen = (key: 'meta' | 'state' | 'participants' | 'voters' | 'facilitator' | 'closed') => {
    unsubs.push(
      onValue(
        sessionRef(code, key),
        (snap: DataSnapshot) => {
          (raw as unknown as Record<string, unknown>)[key] = snap.val();
          if (key === 'meta') syncFacilitatorListeners();
          if (key === 'meta' || key === 'state' || key === 'closed') syncVoteListeners();
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

/* ─── Facilitator actions (guards mirror the former server) ─── */

const writeState = (s: ClientSessionState, patch: Record<string, unknown>) =>
  update(sessionRef(s.code, 'state'), patch);

export async function startVoting(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'lobby') return;
  await writeState(s, { phase: 'voting' });
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

/** Voter flag and anonymous vote are written atomically; rules require both. */
export async function submitVote(s: ClientSessionState, vote: Vote): Promise<void> {
  if (s.phase !== 'voting' || s.hasVoted) return;
  const idx = s.currentCategoryIndex;
  await update(sessionRef(s.code), {
    [`voters/${idx}/${s.myId}`]: true,
    [`votes/${idx}/${randomKey()}`]: { color: vote.color, trend: vote.trend },
  });
}

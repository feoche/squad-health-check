import {
  Ballot,
  Category,
  CategoryResult,
  ClientSessionState,
  FacilitatorNote,
  SessionPhase,
  Vote,
} from '../types';

/**
 * RTDB returns objects whose keys are integers (0..n) as arrays,
 * possibly with null holes — so per-category children may be either shape.
 */
export type Indexed<T> = Record<string, T> | (T | null | undefined)[];

export interface SessionStateNode {
  phase: SessionPhase;
  currentCategoryIndex: number;
  /** Absent in sessions created before the setting existed: counts as true */
  facilitatorVotes?: boolean;
}

/** Raw contents of /sessions/{code}, one field per listened child. */
export interface RawSession {
  meta: { facilitatorId: string; categories: Category[]; createdAt?: number } | null;
  state: SessionStateNode | null;
  participants: Record<string, { name: string }> | null;
  voters: Indexed<Record<string, true>> | null;
  votes: Indexed<Record<string, Vote>> | null;
  /** Only listened to by the facilitator — the rules deny everyone else */
  facilitator: Indexed<Partial<FacilitatorNote>> | null | undefined;
  closed: Indexed<true> | null;
  /** The current user's own ballots, by category index */
  ballots: Record<string, Ballot | null>;
}

export function at<T>(coll: Indexed<T> | null | undefined, idx: number): T | undefined {
  if (!coll) return undefined;
  return (coll as Record<string, T | null | undefined>)[String(idx)] ?? undefined;
}

function votesAt(raw: RawSession, idx: number): Vote[] {
  return Object.values(at(raw.votes, idx) ?? {});
}

function myVote(ballot: Ballot | null | undefined): Vote | null {
  return ballot ? { color: ballot.color, trend: ballot.trend } : null;
}

export function deriveClientState(
  code: string,
  raw: RawSession,
  myId: string,
): ClientSessionState | null {
  if (!raw.meta || !raw.state) return null;

  const { categories, facilitatorId } = raw.meta;
  const { phase, currentCategoryIndex } = raw.state;

  const participants = Object.entries(raw.participants ?? {})
    .map(([id, p]) => ({ id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roundVoters = at(raw.voters, currentCategoryIndex) ?? {};

  const isFacilitator = facilitatorId === myId;

  const facilitatorVotes = raw.state.facilitatorVotes !== false;
  const eligibleVoters = facilitatorVotes
    ? participants
    : participants.filter((p) => p.id !== facilitatorId);
  const voterIds = eligibleVoters.filter((p) => roundVoters[p.id]).map((p) => p.id);

  const facilitatorNotes: Record<number, FacilitatorNote> = {};
  if (isFacilitator) {
    categories.forEach((_, i) => {
      const n = at(raw.facilitator, i);
      if (n?.notes) {
        facilitatorNotes[i] = { notes: n.notes };
      }
    });
  }

  const categoryResults: Record<number, Vote[]> = {};
  categories.forEach((_, i) => {
    if (at(raw.votes, i) !== undefined) categoryResults[i] = votesAt(raw, i);
  });

  const allResults: CategoryResult[] =
    phase === 'finished'
      ? categories.map((_, i) => ({
          categoryIndex: i,
          votes: votesAt(raw, i),
          notes: facilitatorNotes[i]?.notes ?? '',
        }))
      : [];

  return {
    code,
    categories,
    participants,
    currentCategoryIndex,
    phase,
    voteCount: voterIds.length,
    totalVoters: eligibleVoters.length,
    facilitatorVotes,
    eligibleVoters,
    voterIds,
    hasVoted: Boolean(roundVoters[myId]),
    myVote: myVote(raw.ballots[String(currentCategoryIndex)]),
    isFacilitator,
    myId,
    facilitatorId,
    currentResults:
      phase === 'revealed' && at(raw.votes, currentCategoryIndex) !== undefined
        ? votesAt(raw, currentCategoryIndex)
        : null,
    liveResults:
      isFacilitator &&
      phase === 'voting' &&
      at(raw.votes, currentCategoryIndex) !== undefined
        ? votesAt(raw, currentCategoryIndex)
        : null,
    allResults,
    facilitatorNotes,
    facilitatorNotesLoaded: isFacilitator && raw.facilitator !== undefined,
    categoryResults,
  };
}

/**
 * Vote indexes the rules allow reading. Listening to any other index gets the
 * listener cancelled with PERMISSION_DENIED, so only these may be attached.
 * The facilitator may also read categories already closed by "Next category",
 * and the round being voted once they have voted (or right away when they don't vote).
 */
export function readableVoteIndexes(
  state: SessionStateNode,
  categoryCount: number,
  closed: Indexed<true> | null = null,
  isFacilitator = false,
  facilitatorVoted = false,
): number[] {
  const all = Array.from({ length: categoryCount }, (_, i) => i);
  if (state.phase === 'finished') return all;
  return all.filter(
    (i) =>
      (state.phase === 'revealed' && i === state.currentCategoryIndex) ||
      (isFacilitator && at(closed, i) === true) ||
      (isFacilitator &&
        state.phase === 'voting' &&
        i === state.currentCategoryIndex &&
        (facilitatorVoted || state.facilitatorVotes === false)),
  );
}

/** Categories listed in the notes-page summary: those already moved past, or all once finished. */
export function summaryIndexes(
  session: Pick<ClientSessionState, 'phase' | 'currentCategoryIndex' | 'categories'>,
): number[] {
  const count =
    session.phase === 'finished'
      ? session.categories.length
      : session.phase === 'lobby' || session.phase === 'intro'
        ? 0
        : session.currentCategoryIndex;
  return Array.from({ length: count }, (_, i) => i);
}

/** The facilitator's tab reveals the round once every eligible voter has voted. */
export function shouldAutoReveal(session: ClientSessionState): boolean {
  return (
    session.isFacilitator &&
    session.phase === 'voting' &&
    session.totalVoters > 0 &&
    session.voteCount >= session.totalVoters
  );
}

/** With no eligible voter, no round could ever be revealed automatically. */
export function canStartWorkshop(
  session: Pick<ClientSessionState, 'isFacilitator' | 'phase' | 'totalVoters'>,
): boolean {
  return session.isFacilitator && session.phase === 'lobby' && session.totalVoters > 0;
}

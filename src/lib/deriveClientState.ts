import {
  Category,
  CategoryResult,
  ClientSessionState,
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
}

/** Raw contents of /sessions/{code}, one field per listened child. */
export interface RawSession {
  meta: { facilitatorId: string; categories: Category[]; createdAt?: number } | null;
  state: SessionStateNode | null;
  participants: Record<string, { name: string }> | null;
  voters: Indexed<Record<string, true>> | null;
  votes: Indexed<Record<string, Vote>> | null;
  notes: Indexed<string> | null;
}

function at<T>(coll: Indexed<T> | null, idx: number): T | undefined {
  if (!coll) return undefined;
  return (coll as Record<string, T | null | undefined>)[String(idx)] ?? undefined;
}

function votesAt(raw: RawSession, idx: number): Vote[] {
  return Object.values(at(raw.votes, idx) ?? {});
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

  const notes: Record<number, string> = {};
  categories.forEach((_, i) => {
    const n = at(raw.notes, i);
    if (n) notes[i] = n;
  });

  const allResults: CategoryResult[] =
    phase === 'finished'
      ? categories.map((_, i) => ({
          categoryIndex: i,
          votes: votesAt(raw, i),
          notes: notes[i] ?? '',
        }))
      : [];

  return {
    code,
    categories,
    participants,
    currentCategoryIndex,
    phase,
    voteCount: Object.keys(roundVoters).length,
    totalParticipants: participants.length,
    hasVoted: Boolean(roundVoters[myId]),
    isFacilitator: facilitatorId === myId,
    myId,
    facilitatorId,
    currentResults: phase === 'revealed' ? votesAt(raw, currentCategoryIndex) : null,
    allResults,
    notes,
  };
}

/**
 * Vote indexes the rules allow reading. Listening to any other index gets the
 * listener cancelled with PERMISSION_DENIED, so only these may be attached.
 */
export function readableVoteIndexes(state: SessionStateNode, categoryCount: number): number[] {
  if (state.phase === 'finished') return Array.from({ length: categoryCount }, (_, i) => i);
  if (state.phase === 'revealed') return [state.currentCategoryIndex];
  return [];
}

/** The facilitator's tab reveals the round once every participant has voted. */
export function shouldAutoReveal(session: ClientSessionState): boolean {
  return (
    session.isFacilitator &&
    session.phase === 'voting' &&
    session.totalParticipants > 0 &&
    session.voteCount >= session.totalParticipants
  );
}

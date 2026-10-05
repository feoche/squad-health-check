/* ─── Shared types for client and server ─── */

export interface Category {
  name: string;
  nameFr?: string;
  positiveDescription: string;
  mixedDescription: string;
  negativeDescription: string;
  positiveDescriptionFr?: string;
  mixedDescriptionFr?: string;
  negativeDescriptionFr?: string;
}

export type VoteColor = 'green' | 'orange' | 'red';
export type VoteTrend = 'up' | 'stable' | 'down';

export interface Vote {
  color: VoteColor;
  trend: VoteTrend;
}

export interface CategoryResult {
  categoryIndex: number;
  votes: Vote[];
  notes: string;
}

/** Private to the facilitator — never sent to participants (see database.rules.json) */
export interface FacilitatorNote {
  notes: string;
}

export type SessionPhase = 'lobby' | 'intro' | 'voting' | 'revealed' | 'finished';

export interface Participant {
  id: string;
  name: string;
}

/** State sent from server to each client (sanitised per-user) */
export interface ClientSessionState {
  code: string;
  categories: Category[];
  participants: Participant[];
  currentCategoryIndex: number;
  phase: SessionPhase;
  /** Eligible voters who voted in the current round */
  voteCount: number;
  /** Number of eligible voters (participants, minus the facilitator when they don't vote) */
  totalVoters: number;
  /** Whether the facilitator takes part in the vote (absent in the database means true) */
  facilitatorVotes: boolean;
  eligibleVoters: Participant[];
  /** Ids of the eligible voters who voted in the current round, in participant order */
  voterIds: string[];
  hasVoted: boolean;
  isFacilitator: boolean;
  /** Current user's participant id (Firebase anonymous uid) */
  myId: string;
  facilitatorId: string;
  currentResults: Vote[] | null;
  /** Facilitator only: the round's votes as they arrive, once readable (see readableVoteIndexes) */
  liveResults: Vote[] | null;
  allResults: CategoryResult[];
  /** Facilitator-only notes per category index (empty for participants) */
  facilitatorNotes: Record<number, FacilitatorNote>;
  /** True once the facilitator's notes have loaded (always false for participants) */
  facilitatorNotesLoaded: boolean;
  /** Votes of every category whose votes this user has loaded, by index */
  categoryResults: Record<number, Vote[]>;
}


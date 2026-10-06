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

/** Who sees who voted what, once a round is revealed */
export const ANONYMITY_LEVELS = ['off', 'facilitator', 'full'] as const;
export type Anonymity = (typeof ANONYMITY_LEVELS)[number];

/** Chosen when creating the session, fixed afterwards (see database.rules.json) */
export interface SessionSettings {
  facilitatorVotes: boolean;
  anonymity: Anonymity;
  /** Time slot per category, in minutes: the round timer changes colour past it */
  categoryMinutes: number;
}

export interface Vote {
  color: VoteColor;
  trend: VoteTrend;
}

/** A voter's private copy of their vote, which lets them edit it while the round is open */
export interface Ballot extends Vote {
  /** Key of the anonymous vote under votes/{index} */
  key: string;
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

/** A revealed vote with its voter, in sessions that are not fully anonymous */
export interface NamedVote {
  id: string;
  /** Null when the voter is no longer in the participant list */
  name: string | null;
  vote: Vote;
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
  /** Absent in the database means 'full' (sessions created before the setting existed) */
  anonymity: Anonymity;
  /** Absent in the database means DEFAULT_CATEGORY_MINUTES (sessions created before the setting existed) */
  categoryMinutes: number;
  /** Server time the current round's voting opened; null in sessions created before the timer */
  roundStartedAt: number | null;
  eligibleVoters: Participant[];
  /** Ids of the eligible voters who voted in the current round, in participant order */
  voterIds: string[];
  hasVoted: boolean;
  /** The current user's vote in the current round, once their ballot has loaded */
  myVote: Vote | null;
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
  /** Votes with their voter, by category index, for the categories whose ballots this user may read */
  namedVotes: Record<number, NamedVote[]>;
}


/* ─── Shared types for client and server ─── */

export interface Category {
  name: string;
  nameFr?: string;
  positiveDescription: string;
  negativeDescription: string;
  positiveDescriptionFr?: string;
  negativeDescriptionFr?: string;
}

export type VoteColor = 'green' | 'orange' | 'red';
export type VoteTrend = 'up' | 'stable' | 'down';

/** How people vote, chosen when creating the session: a health color, or a score from 1 to 9 */
export const VOTE_MODES = ['colors', 'range'] as const;
export type VoteMode = (typeof VOTE_MODES)[number];

/** Who sees who voted what, once a round is revealed */
export const ANONYMITY_LEVELS = ['off', 'facilitator', 'full'] as const;
export type Anonymity = (typeof ANONYMITY_LEVELS)[number];

/** When people vote: during the meeting, one category at a time, or beforehand on their own time */
export const SESSION_MODES = ['live', 'async'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

/** Chosen when creating the session, fixed afterwards (see database.rules.json) */
export interface SessionSettings {
  mode: SessionMode;
  facilitatorVotes: boolean;
  anonymity: Anonymity;
  voteMode: VoteMode;
  /** Time slot per category, in minutes: the round timer changes colour past it */
  categoryMinutes: number;
}

export interface ColorVote {
  color: VoteColor;
  trend: VoteTrend;
}

/** A score from 1 (lowest) to 9 (highest); never carries a color */
export interface RangeVote {
  score: number;
  trend: VoteTrend;
}

/** The shape follows the session's `voteMode`: ColorVote in 'colors', RangeVote in 'range' */
export type Vote = ColorVote | RangeVote;

/** A voter's private copy of their vote, which lets them edit it while the round is open */
export type Ballot = Vote & {
  /** Key of the anonymous vote under votes/{index} */
  key: string;
};

/** Votes the facilitator added for people present but not connected, counted per cell: by color in 'colors' sessions, by score ("1"…"9") in 'range' ones */
export type OfflineVoteCounts = Partial<Record<string, Partial<Record<VoteTrend, number>>>>;

export interface CategoryResult {
  categoryIndex: number;
  votes: Vote[];
  notes: string;
}

/** Private to the facilitator — never sent to participants (see database.rules.json) */
export interface FacilitatorNote {
  notes: string;
}

export type SessionPhase = 'lobby' | 'intro' | 'collecting' | 'voting' | 'revealed' | 'finished';

export interface Participant {
  id: string;
  name: string;
}

/** How long after its round opened a participant voted, once the round's start time is known */
export interface VoteDelay {
  id: string;
  name: string;
  ms: number;
}

/** A revealed vote with its voter, in sessions that are not fully anonymous */
export interface NamedVote {
  id: string;
  /** Null when the voter is no longer in the participant list */
  name: string | null;
  vote: Vote;
  /** Voted within 2 seconds of the round opening; only known for the current round, whose start time is the only one kept */
  quick?: boolean;
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
  /** Absent in the database means 'colors' (sessions created before the setting existed) */
  voteMode: VoteMode;
  /** Absent in the database means 'live' (sessions created before asynchronous voting) */
  mode: SessionMode;
  /** Categories each eligible voter has voted on, by participant id: the progress of an async session's collecting phase */
  answeredCounts: Record<string, number>;
  /** Indexes of the categories the current user has voted on, ascending */
  myVotedIndexes: number[];
  /** The current user's votes by category index, for the ballots that have loaded */
  myVotes: Record<number, Vote>;
  /** Absent in the database means DEFAULT_CATEGORY_MINUTES (sessions created before the setting existed) */
  categoryMinutes: number;
  /** Server time the current round's voting opened; null in sessions created before the timer */
  roundStartedAt: number | null;
  eligibleVoters: Participant[];
  /** Ids of the eligible voters who voted in the current round, in participant order */
  voterIds: string[];
  /** Ids of the eligible voters who voted within 2 seconds of the round opening, in participant order */
  quickVoterIds: string[];
  /** Facilitator only: ids of the eligible voters with no app connected to the session, in participant order */
  disconnectedIds: string[];
  /** Participants other than the facilitator who said they are ready to move on, in participant order; empty outside the revealed phase */
  readyIds: string[];
  /** Whether the current user said they are ready to move on in the revealed round */
  isReady: boolean;
  /** Time each participant took to vote, by category index, for the rounds whose start time was recorded */
  voteDelays: Record<number, VoteDelay[]>;
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
  /** Votes the facilitator added for people without the app, by category index, already counted in the results */
  offlineVotes: Record<number, Vote[]>;
}


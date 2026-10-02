/* ─── Shared types for client and server ─── */

export interface Category {
  name: string;
  nameFr?: string;
  positiveDescription: string;
  negativeDescription: string;
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
  takeaway: string;
}

/** Private to the facilitator — never sent to participants (see database.rules.json) */
export interface FacilitatorNote {
  notes: string;
  takeaway: string;
}

export type SessionPhase = 'lobby' | 'voting' | 'revealed' | 'finished';

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
  voteCount: number;
  totalParticipants: number;
  hasVoted: boolean;
  isFacilitator: boolean;
  /** Current user's participant id (Firebase anonymous uid) */
  myId: string;
  facilitatorId: string;
  currentResults: Vote[] | null;
  allResults: CategoryResult[];
  /** Facilitator-only notes per category index (empty for participants) */
  facilitatorNotes: Record<number, FacilitatorNote>;
  /** Votes of every category whose votes this user has loaded, by index */
  categoryResults: Record<number, Vote[]>;
}


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
  currentResults: Vote[] | null;
  allResults: CategoryResult[];
  notes: Record<number, string>;
}


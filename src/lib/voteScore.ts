import { ColorVote, RangeVote, Vote, VoteColor, VoteTrend } from '../types';

/* ─── Vote weights: 1 to 9. Colors mode: red getting worse = 1 … green improving = 9, colour outweighs trend. Range mode: the score itself. ─── */

export const MIN_SCORE = 1;
export const MAX_SCORE = 9;

const COLORS_WORST_FIRST: VoteColor[] = ['red', 'orange', 'green'];
const TRENDS_WORST_FIRST: VoteTrend[] = ['down', 'stable', 'up'];

export const isRangeVote = (vote: Vote): vote is RangeVote => 'score' in vote;
export const isColorVote = (vote: Vote): vote is ColorVote => 'color' in vote;

/** The color of a Colors-mode vote; a Range vote has none */
export const colorOf = (vote: Vote): VoteColor | undefined => (isColorVote(vote) ? vote.color : undefined);

export const colorVotes = (votes: Vote[]): ColorVote[] => votes.filter(isColorVote);
export const rangeVotes = (votes: Vote[]): RangeVote[] => votes.filter(isRangeVote);

export function voteWeight(vote: Vote): number {
  if (isRangeVote(vote)) return vote.score;
  return COLORS_WORST_FIRST.indexOf(vote.color) * 3 + TRENDS_WORST_FIRST.indexOf(vote.trend) + 1;
}

/** Median weight of the votes, possibly a half with an even count; null without votes */
export function medianScore(votes: Vote[]): number | null {
  if (!votes.length) return null;
  const weights = votes.map(voteWeight).sort((a, b) => a - b);
  const mid = Math.floor(weights.length / 2);
  return weights.length % 2 ? weights[mid] : (weights[mid - 1] + weights[mid]) / 2;
}

/** Colour and trend of a score (Colors mode); a half rounds up to the healthier cell */
export function scoreCell(score: number): ColorVote {
  const index = Math.ceil(score) - 1;
  return { color: COLORS_WORST_FIRST[Math.floor(index / 3)], trend: TRENDS_WORST_FIRST[index % 3] };
}

/** Votes per score, at index `score - 1` (so nine entries) */
export function scoreCounts(votes: RangeVote[]): number[] {
  const counts = Array.from({ length: MAX_SCORE }, () => 0);
  for (const { score } of votes) counts[score - MIN_SCORE]++;
  return counts;
}

export function trendCounts(votes: Vote[]): Record<VoteTrend, number> {
  const counts: Record<VoteTrend, number> = { up: 0, stable: 0, down: 0 };
  for (const { trend } of votes) counts[trend]++;
  return counts;
}

/** The results cell of a vote: "red/down" in Colors sessions, "7/up" in Range ones */
export const cellKey = (vote: Vote): string => `${isRangeVote(vote) ? vote.score : vote.color}/${vote.trend}`;

export const sameCell = (a: Vote, b: Vote): boolean => cellKey(a) === cellKey(b);

/** A score as read by people: a whole number, or with its half */
export const formatScore = (score: number): string => String(score);

import { Vote, VoteColor, VoteTrend } from '../types';

/* ─── Vote weights: 1 (red, getting worse) to 9 (green, improving); colour outweighs trend ─── */

export const MAX_SCORE = 9;

const COLORS_WORST_FIRST: VoteColor[] = ['red', 'orange', 'green'];
const TRENDS_WORST_FIRST: VoteTrend[] = ['down', 'stable', 'up'];

export function voteWeight({ color, trend }: Vote): number {
  return COLORS_WORST_FIRST.indexOf(color) * 3 + TRENDS_WORST_FIRST.indexOf(trend) + 1;
}

/** Median weight of the votes, possibly a half with an even count; null without votes */
export function medianScore(votes: Vote[]): number | null {
  if (!votes.length) return null;
  const weights = votes.map(voteWeight).sort((a, b) => a - b);
  const mid = Math.floor(weights.length / 2);
  return weights.length % 2 ? weights[mid] : (weights[mid - 1] + weights[mid]) / 2;
}

/** Colour and trend of a score; a half rounds up to the healthier cell */
export function scoreCell(score: number): Vote {
  const index = Math.ceil(score) - 1;
  return { color: COLORS_WORST_FIRST[Math.floor(index / 3)], trend: TRENDS_WORST_FIRST[index % 3] };
}

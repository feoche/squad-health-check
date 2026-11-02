import { Vote } from '../types';
import { t } from './i18n';
import { isRangeVote } from './voteScore';

/** A vote in words: "Green, improving" or "7 out of 9, stable" */
export function voteText(vote: Vote): string {
  const main = isRangeVote(vote) ? t.voting.scoreValue(vote.score) : t.colors[vote.color];
  return `${main}, ${t.trends[vote.trend]}`;
}

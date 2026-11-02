import { Vote, VoteMode } from '../types';
import { colorVotes, rangeVotes } from '../lib/voteScore';
import ScoreHistogram from './ScoreHistogram';
import VoteMatrix from './VoteMatrix';

/** A category's votes as the mode shows them: the colour × trend matrix, or the score histogram */
function VoteBreakdown({ votes, voteMode, compact = false }: { votes: Vote[]; voteMode: VoteMode; compact?: boolean }) {
  return voteMode === 'range' ? (
    <ScoreHistogram votes={rangeVotes(votes)} compact={compact} />
  ) : (
    <VoteMatrix votes={colorVotes(votes)} compact={compact} />
  );
}

export default VoteBreakdown;

import { Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote, VoteMode } from '../types';
import { medianScore } from '../lib/voteScore';
import { t } from '../lib/i18n';
import MedianBadge from './MedianBadge';

/** Result of a category: its median health, as one badge in the colour, reading the colour beside the trend arrow, after a "Median:" prefix unless `prefix` is off. `large` for the shared screen. */
function VoteSummary({
  votes,
  large = false,
  prefix = true,
  voteMode,
}: {
  votes: Vote[];
  large?: boolean;
  prefix?: boolean;
  voteMode?: VoteMode;
}) {
  const score = medianScore(votes);
  if (score === null) return <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>;

  return (
    <span className="inline vote-summary">
      {prefix && (
        <Text preset={large ? TEXT_PRESET.heading4 : TEXT_PRESET.span} as="span">{t.results.medianPrefix}</Text>
      )}
      <MedianBadge score={score} large={large} voteMode={voteMode} />
    </span>
  );
}

export default VoteSummary;

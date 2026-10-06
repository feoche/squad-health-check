import { Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { medianScore } from '../lib/voteScore';
import { t } from '../lib/i18n';
import MedianBadge from './MedianBadge';

/** Result of a category: its median health, as one badge in the colour, reading the trend, after a "Median:" prefix unless `prefix` is off. `large` for the shared screen. */
function VoteSummary({ votes, large = false, prefix = true }: { votes: Vote[]; large?: boolean; prefix?: boolean }) {
  const score = medianScore(votes);
  if (score === null) return <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>;

  return (
    <span className="inline vote-summary">
      {prefix && (
        <Text preset={large ? TEXT_PRESET.heading4 : TEXT_PRESET.span} as="span">{t.results.medianPrefix}</Text>
      )}
      <MedianBadge score={score} large={large} />
    </span>
  );
}

export default VoteSummary;

import { Badge, BADGE_SIZE, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { medianScore, scoreCell } from '../lib/voteScore';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

/** Result of a category: its median health, as one badge in the colour, reading the trend, after a "Median:" prefix unless `prefix` is off. `large` for the shared screen. */
function VoteSummary({ votes, large = false, prefix = true }: { votes: Vote[]; large?: boolean; prefix?: boolean }) {
  const score = medianScore(votes);
  if (score === null) return <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>;

  const cell = scoreCell(score);
  const color = COLOR_OPTIONS.find((o) => o.value === cell.color)!;
  const trend = TREND_OPTIONS.find((o) => o.value === cell.trend)!;

  return (
    <span className="inline vote-summary">
      {prefix && (
        <Text preset={large ? TEXT_PRESET.heading4 : TEXT_PRESET.span} as="span">{t.results.medianPrefix}</Text>
      )}
      <Badge className="vote-summary__badge" color={color.badge} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
        <span className="visually-hidden">{color.label}, </span>
        <span>{trend.label}</span>
        <Icon name={trend.icon} aria-hidden />
      </Badge>
    </span>
  );
}

export default VoteSummary;

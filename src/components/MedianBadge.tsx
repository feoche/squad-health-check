import { Badge, BADGE_SIZE, Icon } from '@ovhcloud/ods-react';
import { scoreCell } from '../lib/voteScore';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

/** A median score as one badge in its colour, reading its trend. `large` for the shared screen. */
function MedianBadge({ score, large = false }: { score: number; large?: boolean }) {
  const cell = scoreCell(score);
  const color = COLOR_OPTIONS.find((o) => o.value === cell.color)!;
  const trend = TREND_OPTIONS.find((o) => o.value === cell.trend)!;

  return (
    <Badge className="vote-summary__badge" color={color.badge} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
      <span className="visually-hidden">{color.label}, </span>
      <span>{trend.label}</span>
      <Icon name={trend.icon} aria-hidden />
    </Badge>
  );
}

export default MedianBadge;

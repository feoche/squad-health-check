import { Badge, BADGE_COLOR, BADGE_SIZE, Icon } from '@ovhcloud/ods-react';
import { VoteMode } from '../types';
import { formatScore, scoreCell } from '../lib/voteScore';
import { t } from '../lib/i18n';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

/** A median score as one badge in its colour, reading the colour beside its trend arrow. `large` for the shared screen. */
function MedianBadge({ score, large = false, voteMode = 'colors' }: { score: number; large?: boolean; voteMode?: VoteMode }) {
  if (voteMode === 'range') {
    return (
      <Badge className="vote-summary__badge" color={BADGE_COLOR.neutral} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
        {t.results.scoreOutOf(formatScore(score))}
      </Badge>
    );
  }
  const cell = scoreCell(score);
  const color = COLOR_OPTIONS.find((o) => o.value === cell.color)!;
  const trend = TREND_OPTIONS.find((o) => o.value === cell.trend)!;

  return (
    <Badge className="vote-summary__badge" color={color.badge} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
      <span>{color.label}</span>
      <span className="visually-hidden">, {trend.label}</span>
      <Icon name={trend.icon} aria-hidden />
    </Badge>
  );
}

export default MedianBadge;

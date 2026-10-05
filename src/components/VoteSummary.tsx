import { Badge, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { countColors, countTrends, dominantColor, dominantTrend } from '../lib/exportReport';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

/** One-line result of a category: dominant colour and trend, then the counts. */
function VoteSummary({ votes }: { votes: Vote[] }) {
  const color = COLOR_OPTIONS.find((o) => o.value === dominantColor(votes));
  const trend = TREND_OPTIONS.find((o) => o.value === dominantTrend(votes));
  if (!color || !trend) return <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>;

  const colors = countColors(votes);
  const trends = countTrends(votes);

  return (
    <div className="inline wrap">
      <Text preset={TEXT_PRESET.label}>{t.results.mostly}</Text>
      <Badge color={color.badge}>{color.label}</Badge>
      <Text preset={TEXT_PRESET.span}>
        <Icon name={trend.icon} /> {trend.label}
      </Text>
      <Text preset={TEXT_PRESET.caption}>
        {COLOR_OPTIONS.map((o) => `${o.label} ${colors[o.value]}`).join(' · ')}
        {' — '}
        {TREND_OPTIONS.map((o) => `${o.label} ${trends[o.value]}`).join(' · ')}
        {` (${t.votes(votes.length)})`}
      </Text>
    </div>
  );
}

export default VoteSummary;

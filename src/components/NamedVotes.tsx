import { Badge, BADGE_SIZE, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { NamedVote } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

/** Each voter as a badge in their colour with their trend, stacked in columns. */
function NamedVotes({ votes }: { votes: NamedVote[] }) {
  if (!votes.length) return null;
  return (
    <div className="stack named-votes">
      <Text preset={TEXT_PRESET.heading5}>{t.results.byPerson}</Text>
      <ul className="named-votes__list">
        {votes.map(({ id, name, vote }) => {
          const color = COLOR_OPTIONS.find((o) => o.value === vote.color)!;
          const trend = TREND_OPTIONS.find((o) => o.value === vote.trend)!;
          return (
            <li key={id} className="named-votes__item">
              <Badge className="named-votes__badge" color={color.badge} size={BADGE_SIZE.lg}>
                <span className="named-votes__name">{name ?? t.results.unknownVoter}</span>
                <Icon name={trend.icon} aria-hidden="true" />
                <span className="visually-hidden">
                  {' — '}
                  {color.label}, {trend.label}
                </span>
              </Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default NamedVotes;

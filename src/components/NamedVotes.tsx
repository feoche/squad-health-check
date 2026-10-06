import { Badge, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { NamedVote } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

/** Each voter with their colour and trend, under a vote matrix. */
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
              <Text preset={TEXT_PRESET.span} className="named-votes__name">
                {name ?? t.results.unknownVoter}
              </Text>
              <Badge color={color.badge}>{color.label}</Badge>
              <span className="named-votes__trend" title={trend.label}>
                <Icon name={trend.icon} aria-hidden="true" />
                <span className="visually-hidden">{trend.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default NamedVotes;

import { Badge, BADGE_COLOR, BADGE_SIZE, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { NamedVote } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';
import { isRangeVote } from '../lib/voteScore';

/** Each voter as a badge in their colour (or with their score) and trend, stacked in columns. */
function NamedVotes({ votes }: { votes: NamedVote[] }) {
  if (!votes.length) return null;
  return (
    <div className="stack named-votes">
      <Text preset={TEXT_PRESET.heading5} as="h3">{t.results.byPerson}</Text>
      <ul className="named-votes__list">
        {votes.map(({ id, name, vote, quick }) => {
          const range = isRangeVote(vote);
          const color = range ? undefined : COLOR_OPTIONS.find((o) => o.value === vote.color)!;
          const trend = TREND_OPTIONS.find((o) => o.value === vote.trend)!;
          const summary = range ? t.results.scoreOutOf(String(vote.score)) : color!.label;
          return (
            <li key={id} className="named-votes__item">
              <Badge className="named-votes__badge" color={color ? color.badge : BADGE_COLOR.neutral} size={BADGE_SIZE.lg}>
                {quick && <span aria-hidden="true">⚡ </span>}
                <span className="named-votes__name">{name ?? t.results.unknownVoter}</span>
                {range && <span aria-hidden="true">{vote.score}</span>}
                <Icon name={trend.icon} aria-hidden="true" />
                <span className="visually-hidden">
                  {' — '}
                  {summary}, {trend.label}
                  {quick && `, ${t.facilitator.quickVote}`}
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

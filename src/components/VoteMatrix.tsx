import { Badge, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

/** Votes cross-tabulated by health color (rows) and trend (columns). */
function VoteMatrix({ votes, compact = false }: { votes: Vote[]; compact?: boolean }) {
  const count = (color: VoteColor, trend: VoteTrend) =>
    votes.filter((v) => v.color === color && v.trend === trend).length;
  const max = Math.max(
    1,
    ...COLOR_OPTIONS.flatMap((c) => TREND_OPTIONS.map((t) => count(c.value, t.value))),
  );

  return (
    <table className={compact ? 'vote-matrix vote-matrix-compact' : 'vote-matrix'}>
      <thead>
        <tr>
          <td />
          {TREND_OPTIONS.map(({ value, label, icon }) => (
            <th key={value} scope="col">
              <Text preset={TEXT_PRESET.span} title={compact ? label : undefined}>
                <Icon name={icon} aria-hidden="true" />{' '}
                <span className={compact ? 'visually-hidden' : undefined}>{label} </span>(
                {votes.filter((v) => v.trend === value).length})
              </Text>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {COLOR_OPTIONS.map(({ value: color, label, badge }) => (
          <tr key={color}>
            <th scope="row">
              <Badge color={badge}>
                {label} ({votes.filter((v) => v.color === color).length})
              </Badge>
            </th>
            {TREND_OPTIONS.map(({ value: trend }) => {
              const n = count(color, trend);
              return (
                <td
                  key={trend}
                  className="vote-matrix-cell"
                  style={
                    {
                      '--cell-color': `var(--ods-color-${badge}-300)`,
                      '--cell-strength': `${(n / max) * 100}%`,
                    } as React.CSSProperties
                  }
                >
                  <Text preset={n ? (compact ? TEXT_PRESET.label : TEXT_PRESET.heading4) : TEXT_PRESET.caption}>
                    {n}
                  </Text>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default VoteMatrix;

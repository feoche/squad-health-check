import { Badge, BADGE_SIZE, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS_WORST_FIRST } from './voteOptions';

/** Worsening on the left, improving on the right, so healthy-and-improving lands top right. */
const MATRIX_TRENDS = TREND_OPTIONS_WORST_FIRST;

/** Votes cross-tabulated by health color (rows) and trend (columns). */
function VoteMatrix({ votes, compact = false }: { votes: Vote[]; compact?: boolean }) {
  const count = (color: VoteColor, trend: VoteTrend) =>
    votes.filter((v) => v.color === color && v.trend === trend).length;
  const max = Math.max(
    1,
    ...COLOR_OPTIONS.flatMap((c) => MATRIX_TRENDS.map((t) => count(c.value, t.value))),
  );

  return (
    <table className={compact ? 'vote-matrix vote-matrix-compact' : 'vote-matrix'}>
      <thead>
        <tr>
          <td />
          {MATRIX_TRENDS.map(({ value, label, icon }) => (
            <th key={value} scope="col">
              <span className="vote-matrix-trend" title={label}>
                <Icon name={icon} aria-hidden="true" />
                <span className="visually-hidden">{label}</span>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {COLOR_OPTIONS.map(({ value: color, label, badge }) => (
          <tr key={color}>
            <th scope="row">
              <Badge color={badge} size={compact ? BADGE_SIZE.md : BADGE_SIZE.lg}>
                {label}
              </Badge>
            </th>
            {MATRIX_TRENDS.map(({ value: trend }) => {
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

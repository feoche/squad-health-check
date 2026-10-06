import {
  Badge,
  BADGE_SIZE,
  Button,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Vote, VoteColor, VoteTrend } from '../types';
import { t as messages } from '../lib/i18n';
import { COLOR_OPTIONS, TREND_OPTIONS_WORST_FIRST } from './voteOptions';

/** Worsening on the left, improving on the right, so healthy-and-improving lands top right. */
const MATRIX_TRENDS = TREND_OPTIONS_WORST_FIRST;

interface Props {
  votes: Vote[];
  compact?: boolean;
  /** The facilitator's votes for people without the app, already in `votes`: only these can be removed */
  offlineVotes?: Vote[];
  /** Shows + and − in each cell to add or remove an offline vote */
  onAdjust?: (vote: Vote, delta: 1 | -1) => void;
}

const countOf = (votes: Vote[], color: VoteColor, trend: VoteTrend) =>
  votes.filter((v) => v.color === color && v.trend === trend).length;

/** Votes cross-tabulated by health color (rows) and trend (columns). */
function VoteMatrix({ votes, compact = false, offlineVotes = [], onAdjust }: Props) {
  const count = (color: VoteColor, trend: VoteTrend) => countOf(votes, color, trend);
  const max = Math.max(
    1,
    ...COLOR_OPTIONS.flatMap((c) => MATRIX_TRENDS.map((t) => count(c.value, t.value))),
  );

  return (
    <table className={compact ? 'vote-matrix vote-matrix--compact' : 'vote-matrix'}>
      <caption className="visually-hidden">{messages.results.matrixCaption}</caption>
      <thead>
        <tr>
          <td />
          {MATRIX_TRENDS.map(({ value, label, icon }) => (
            <th key={value} scope="col" className="vote-matrix__col-header">
              <span className="vote-matrix__trend" title={label}>
                <Icon name={icon} aria-hidden="true" />
                <span className="visually-hidden">{label}</span>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {COLOR_OPTIONS.map(({ value: color, label, badge }) => (
          <tr key={color} className={`vote-matrix__row vote-matrix__row--${color}`}>
            <th scope="row" className="vote-matrix__row-header">
              <Badge color={badge} size={compact ? BADGE_SIZE.md : BADGE_SIZE.lg}>
                {label}
              </Badge>
            </th>
            {MATRIX_TRENDS.map(({ value: trend, label: trendLabel }) => {
              const n = count(color, trend);
              const added = countOf(offlineVotes, color, trend);
              return (
                <td
                  key={trend}
                  className="vote-matrix__cell"
                  style={
                    {
                      '--cell-color': `var(--ods-color-${badge}-100)`,
                      '--cell-strength': `${(n / max) * 100}%`,
                    } as React.CSSProperties
                  }
                >
                  <span className="vote-matrix__count">
                    <Text
                      preset={n ? (compact ? TEXT_PRESET.label : TEXT_PRESET.heading4) : TEXT_PRESET.caption}
                      as="span"
                    >
                      {n}
                    </Text>
                    {added > 0 && (
                      <span className="vote-matrix__manual" title={messages.facilitator.offlineInCell(added)}>
                        <Icon name={ICON_NAME.pen} aria-hidden="true" />
                        <span className="visually-hidden">{messages.facilitator.offlineInCell(added)}</span>
                      </span>
                    )}
                  </span>
                  {onAdjust && (
                    <span className="inline vote-matrix__adjust">
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        disabled={!added}
                        aria-label={messages.facilitator.removeOfflineVote(label, trendLabel)}
                        title={messages.facilitator.removeOfflineVote(label, trendLabel)}
                        onClick={() => onAdjust({ color, trend }, -1)}
                      >
                        <Icon name={ICON_NAME.minus} />
                      </Button>
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        aria-label={messages.facilitator.addOfflineVote(label, trendLabel)}
                        title={messages.facilitator.addOfflineVote(label, trendLabel)}
                        onClick={() => onAdjust({ color, trend }, 1)}
                      >
                        <Icon name={ICON_NAME.plus} />
                      </Button>
                    </span>
                  )}
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

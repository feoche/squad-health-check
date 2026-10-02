import {
  Badge,
  Button,
  Card,
  Icon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Vote, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

interface Props {
  votes: Vote[];
  isFacilitator: boolean;
  isLastCategory: boolean;
  onNextCategory: () => void;
  onEndSession: () => void;
}

/** Votes cross-tabulated by health color (rows) and trend (columns). */
function VoteMatrix({ votes }: { votes: Vote[] }) {
  const count = (color: VoteColor, trend: VoteTrend) =>
    votes.filter((v) => v.color === color && v.trend === trend).length;
  const max = Math.max(
    1,
    ...COLOR_OPTIONS.flatMap((c) => TREND_OPTIONS.map((t) => count(c.value, t.value))),
  );

  return (
    <table className="vote-matrix">
      <thead>
        <tr>
          <td />
          {TREND_OPTIONS.map(({ value, label, icon }) => (
            <th key={value} scope="col">
              <Text preset={TEXT_PRESET.span}>
                <Icon name={icon} /> {label} ({votes.filter((v) => v.trend === value).length})
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
                  <Text preset={n ? TEXT_PRESET.heading4 : TEXT_PRESET.caption}>{n}</Text>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultsGrid({
  votes,
  isFacilitator,
  isLastCategory,
  onNextCategory,
  onEndSession,
}: Props) {
  const total = votes.length;

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading3}>Results ({total} votes)</Text>

      <div className="table-scroll">
        <VoteMatrix votes={votes} />
      </div>

      {isFacilitator && (
        <div className="actions">
          {!isLastCategory ? (
            <Button onClick={onNextCategory}>
              Next Category
              <Icon name={ICON_NAME.arrowRight} />
            </Button>
          ) : (
            <Button onClick={onEndSession}>
              Finish Session
              <Icon name={ICON_NAME.check} />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default ResultsGrid;

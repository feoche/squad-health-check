import {
  Badge,
  Button,
  Card,
  Icon,
  ICON_NAME,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

interface Props {
  votes: Vote[];
  isFacilitator: boolean;
  isLastCategory: boolean;
  onNextCategory: () => void;
  onEndSession: () => void;
}

function ResultRow({
  label,
  count,
  total,
}: {
  label: React.ReactNode;
  count: number;
  total: number;
}) {
  return (
    <div className="result-row">
      <div className="result-label">{label}</div>
      <ProgressBar className="grow" value={count} max={Math.max(total, 1)} />
      <Text preset={TEXT_PRESET.label}>{count}</Text>
    </div>
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

      <div className="stack">
        <Text preset={TEXT_PRESET.heading5}>Health Color</Text>
        {COLOR_OPTIONS.map(({ value, label, badge }) => (
          <ResultRow
            key={value}
            label={<Badge color={badge}>{label}</Badge>}
            count={votes.filter((v) => v.color === value).length}
            total={total}
          />
        ))}
      </div>

      <div className="stack">
        <Text preset={TEXT_PRESET.heading5}>Trend</Text>
        {TREND_OPTIONS.map(({ value, label, icon }) => (
          <ResultRow
            key={value}
            label={
              <Text preset={TEXT_PRESET.span}>
                <Icon name={icon} /> {label}
              </Text>
            }
            count={votes.filter((v) => v.trend === value).length}
            total={total}
          />
        ))}
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

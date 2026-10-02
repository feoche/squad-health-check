import {
  Badge,
  Button,
  Card,
  CARD_COLOR,
  FormField,
  FormFieldLabel,
  Icon,
  ICON_NAME,
  ProgressBar,
  Text,
  Textarea,
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
  notes: string;
  onUpdateNotes: (notes: string) => void;
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
  notes,
  onUpdateNotes,
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

      {isFacilitator ? (
        <FormField>
          <FormFieldLabel>Discussion Notes</FormFieldLabel>
          <Textarea
            placeholder="Write down key discussion points…"
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            rows={4}
            maxLength={5000}
          />
        </FormField>
      ) : (
        <div className="stack">
          <Text preset={TEXT_PRESET.heading5}>Discussion Notes</Text>
          <Card className="card-body card-compact" color={CARD_COLOR.neutral}>
            <Text preset={TEXT_PRESET.paragraph} className="pre-wrap">
              {notes || 'No notes yet…'}
            </Text>
          </Card>
        </div>
      )}

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

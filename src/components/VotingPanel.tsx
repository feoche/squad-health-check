import { useRef, useState } from 'react';
import {
  Badge,
  BUTTON_VARIANT,
  Button,
  FormField,
  FormFieldError,
  FormFieldLabel,
  Icon,
  Radio,
  RadioControl,
  RadioGroup,
  RadioLabel,
  Text,
  TEXT_PRESET,
  Tile,
} from '@ovhcloud/ods-react';
import { Category, Vote, VoteMode, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS_WORST_FIRST, colorDescription } from './voteOptions';
import ScoreInput from './ScoreInput';
import { t } from '../lib/i18n';
import { colorOf, isRangeVote } from '../lib/voteScore';

interface Props {
  category: Category;
  voteMode: VoteMode;
  onSubmitVote: (vote: Vote) => void;
  /** The vote being edited: its picks are preselected */
  initialVote?: Vote | null;
  onCancel?: () => void;
  /** Overrides the default submit label */
  submitLabel?: string;
}

/** The vote form. Render it with a key per category so picks never carry over. */
function VotingPanel({ category, voteMode, onSubmitVote, initialVote, onCancel, submitLabel }: Props) {
  const range = voteMode === 'range';
  const [selectedColor, setSelectedColor] = useState<VoteColor | null>((initialVote && colorOf(initialVote)) ?? null);
  const [selectedScore, setSelectedScore] = useState<number | null>(
    initialVote && isRangeVote(initialVote) ? initialVote.score : null,
  );
  const [selectedTrend, setSelectedTrend] = useState<VoteTrend | null>(initialVote?.trend ?? null);
  const [submitted, setSubmitted] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (selectedTrend) {
      if (range && selectedScore !== null) return onSubmitVote({ score: selectedScore, trend: selectedTrend });
      if (!range && selectedColor) return onSubmitVote({ color: selectedColor, trend: selectedTrend });
    }
    // Take the voter to the first question left unanswered, where its error is read out
    const firstMissing = (range ? selectedScore === null : !selectedColor) ? 'main' : 'trend';
    const selector =
      firstMissing === 'trend'
        ? '.voting-panel__field--trend input:not(:disabled)'
        : range
          ? '.voting-panel__field--score [role="slider"]'
          : '.voting-panel__field--color input:not(:disabled)';
    form.current?.querySelector<HTMLElement>(selector)?.focus();
  };

  const colorMissing = submitted && !range && !selectedColor;
  const scoreMissing = submitted && range && selectedScore === null;
  const trendMissing = submitted && !selectedTrend;

  return (
    <form className="stack voting-panel" ref={form} onSubmit={handleSubmit} noValidate>
      {!range && (
        <FormField className="voting-panel__field voting-panel__field--color" invalid={colorMissing}>
          <FormFieldLabel className="voting-panel__field-label">{t.voting.healthColor}</FormFieldLabel>
          <RadioGroup
            className="voting-panel__options voting-panel__options--color"
            orientation="horizontal"
            value={selectedColor ?? undefined}
            onValueChange={({ value }) => setSelectedColor(value as VoteColor)}
          >
            {COLOR_OPTIONS.map((option) => (
              <Tile
                key={option.value}
                className={`voting-panel__tile--${option.value}`}
                selected={selectedColor === option.value}
              >
                <Radio className="voting-panel__radio" value={option.value}>
                  <div className="voting-panel__radio-body">
                    <RadioControl />
                    <RadioLabel>
                      <Badge color={option.badge}>{option.label}</Badge>
                    </RadioLabel>
                    <Text className="voting-panel__description" preset={TEXT_PRESET.paragraph}>
                      {colorDescription(category, option)}
                    </Text>
                  </div>
                </Radio>
              </Tile>
            ))}
          </RadioGroup>
          <FormFieldError>{t.voting.pickColor}</FormFieldError>
        </FormField>
      )}

      {range && (
        <FormField className="voting-panel__field voting-panel__field--score" invalid={scoreMissing}>
          <FormFieldLabel className="voting-panel__field-label">{t.voting.score}</FormFieldLabel>
          <ScoreInput category={category} score={selectedScore} invalid={scoreMissing} onChange={setSelectedScore} />
          <FormFieldError>{t.voting.pickScore}</FormFieldError>
        </FormField>
      )}

      <FormField className="voting-panel__field voting-panel__field--trend" invalid={trendMissing}>
        <FormFieldLabel className="voting-panel__field-label">{t.voting.trend}</FormFieldLabel>
        <RadioGroup
          className="voting-panel__options voting-panel__options--trend"
          orientation="horizontal"
          value={selectedTrend ?? undefined}
          onValueChange={({ value }) => setSelectedTrend(value as VoteTrend)}
        >
          {/* Captioned rather than in a tooltip: a tooltip never shows on touch or to keyboard users */}
          {TREND_OPTIONS_WORST_FIRST.map(({ value, label, icon }) => (
            <Tile key={value} selected={selectedTrend === value}>
              <Radio className="voting-panel__radio" value={value}>
                <div className="voting-panel__radio-body">
                  <RadioControl />
                  <RadioLabel>
                    <Icon name={icon} />
                    <span className="voting-panel__trend-caption">{label}</span>
                  </RadioLabel>
                </div>
              </Radio>
            </Tile>
          ))}
        </RadioGroup>
        <FormFieldError>{t.voting.pickTrend}</FormFieldError>
      </FormField>

      <div className="actions voting-panel__submit">
        {onCancel && (
          <Button type="button" variant={BUTTON_VARIANT.outline} onClick={onCancel}>
            {t.voting.cancelEdit}
          </Button>
        )}
        <Button type="submit">{submitLabel ?? (initialVote ? t.voting.update : t.voting.submit)}</Button>
      </div>
    </form>
  );
}

export default VotingPanel;

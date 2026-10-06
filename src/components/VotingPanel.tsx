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
import { Category, Vote, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS_WORST_FIRST, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

interface Props {
  category: Category;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  /** The vote being edited: its picks are preselected */
  initialVote?: Vote | null;
  onCancel?: () => void;
}

/** The vote form. Render it with a key per category so picks never carry over. */
function VotingPanel({ category, onSubmitVote, initialVote, onCancel }: Props) {
  const [selectedColor, setSelectedColor] = useState<VoteColor | null>(initialVote?.color ?? null);
  const [selectedTrend, setSelectedTrend] = useState<VoteTrend | null>(initialVote?.trend ?? null);
  const [submitted, setSubmitted] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (selectedColor && selectedTrend) {
      onSubmitVote(selectedColor, selectedTrend);
      return;
    }
    // Take the voter to the first question left unanswered, where its error is read out
    const field = selectedColor ? 'trend' : 'color';
    form.current
      ?.querySelector<HTMLInputElement>(`.voting-panel__field--${field} input:not(:disabled)`)
      ?.focus();
  };

  const colorMissing = submitted && !selectedColor;
  const trendMissing = submitted && !selectedTrend;

  return (
    <form className="stack voting-panel" ref={form} onSubmit={handleSubmit} noValidate>
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
        <Button type="submit">{initialVote ? t.voting.update : t.voting.submit}</Button>
      </div>
    </form>
  );
}

export default VotingPanel;

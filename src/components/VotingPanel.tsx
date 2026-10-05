import { useState } from 'react';
import {
  Badge,
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
import { Category, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

interface Props {
  category: Category;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
}

/** The vote form. Render it with a key per category so picks never carry over. */
function VotingPanel({ category, onSubmitVote }: Props) {
  const [selectedColor, setSelectedColor] = useState<VoteColor | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<VoteTrend | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (selectedColor && selectedTrend) {
      onSubmitVote(selectedColor, selectedTrend);
    }
  };

  const colorMissing = submitted && !selectedColor;
  const trendMissing = submitted && !selectedTrend;

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <FormField invalid={colorMissing}>
        <FormFieldLabel className="vote-field-label">{t.voting.healthColor}</FormFieldLabel>
        <RadioGroup
          className="tile-options"
          orientation="horizontal"
          value={selectedColor ?? undefined}
          onValueChange={({ value }) => setSelectedColor(value as VoteColor)}
        >
          {COLOR_OPTIONS.map((option) => (
            <Tile key={option.value} selected={selectedColor === option.value}>
              <Radio className="tile-radio-root" value={option.value}>
                <div className="tile-radio">
                  <RadioControl />
                  <RadioLabel>
                    <Badge color={option.badge}>{option.label}</Badge>
                  </RadioLabel>
                  <Text className="tile-radio-description" preset={TEXT_PRESET.paragraph}>
                    {colorDescription(category, option)}
                  </Text>
                </div>
              </Radio>
            </Tile>
          ))}
        </RadioGroup>
        <FormFieldError>{t.voting.pickColor}</FormFieldError>
      </FormField>

      <FormField invalid={trendMissing}>
        <FormFieldLabel className="vote-field-label">{t.voting.trend}</FormFieldLabel>
        <RadioGroup
          className="tile-options tile-options-trend"
          orientation="horizontal"
          value={selectedTrend ?? undefined}
          onValueChange={({ value }) => setSelectedTrend(value as VoteTrend)}
        >
          {TREND_OPTIONS.map(({ value, label, icon }) => (
            <Tile key={value} selected={selectedTrend === value}>
              <Radio className="tile-radio-root" value={value}>
                <div className="tile-radio">
                  <RadioControl />
                  <RadioLabel>
                    <Icon name={icon} /> <span>{label}</span>
                  </RadioLabel>
                </div>
              </Radio>
            </Tile>
          ))}
        </RadioGroup>
        <FormFieldError>{t.voting.pickTrend}</FormFieldError>
      </FormField>

      <div className="actions vote-submit">
        <Button type="submit">{t.voting.submit}</Button>
      </div>
    </form>
  );
}

export default VotingPanel;

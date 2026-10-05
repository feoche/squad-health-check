import { useState } from 'react';
import {
  Badge,
  Button,
  BUTTON_VARIANT,
  FormField,
  FormFieldError,
  FormFieldLabel,
  Icon,
  ICON_NAME,
  ProgressBar,
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
  hasVoted: boolean;
  voteCount: number;
  totalParticipants: number;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  isFacilitator: boolean;
  onRevealVotes: () => void;
}

function VotingPanel({
  category,
  hasVoted,
  voteCount,
  totalParticipants,
  onSubmitVote,
  isFacilitator,
  onRevealVotes,
}: Props) {
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

  const progress = (
    <div className="stack stack-center">
      <Text preset={TEXT_PRESET.paragraph}>
        {t.votesReceived(voteCount, totalParticipants)}
      </Text>
      <ProgressBar
        className="vote-progress"
        value={voteCount}
        max={totalParticipants}
        aria-label={t.voting.votesReceivedLabel}
      />
    </div>
  );

  if (hasVoted) {
    return (
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading3}>
          <Icon name={ICON_NAME.circleCheck} /> {t.voting.submitted}
        </Text>
        {progress}
        {isFacilitator && voteCount < totalParticipants && (
          <Button variant={BUTTON_VARIANT.outline} onClick={onRevealVotes}>
            {t.voting.revealNow}
          </Button>
        )}
      </div>
    );
  }

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

      {progress}

      {isFacilitator && voteCount > 0 && (
        <div className="actions">
          <Button
            type="button"
            variant={BUTTON_VARIANT.outline}
            onClick={onRevealVotes}
          >
            {t.voting.revealNowCount(voteCount, totalParticipants)}
          </Button>
        </div>
      )}
    </form>
  );
}

export default VotingPanel;

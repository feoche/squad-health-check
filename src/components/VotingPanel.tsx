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
        {voteCount} / {totalParticipants} votes received
      </Text>
      <ProgressBar
        className="vote-progress"
        value={voteCount}
        max={totalParticipants}
        aria-label="Votes received"
      />
    </div>
  );

  if (hasVoted) {
    return (
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading3}>
          <Icon name={ICON_NAME.circleCheck} /> Vote submitted!
        </Text>
        {progress}
        {isFacilitator && voteCount < totalParticipants && (
          <Button variant={BUTTON_VARIANT.outline} onClick={onRevealVotes}>
            Reveal Votes Now
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
        <FormFieldLabel>Health Color</FormFieldLabel>
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
        <FormFieldError>Pick a health color.</FormFieldError>
      </FormField>

      <FormField invalid={trendMissing}>
        <FormFieldLabel>Trend</FormFieldLabel>
        <RadioGroup
          className="tile-options"
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
                    <Icon name={icon} /> {label}
                  </RadioLabel>
                </div>
              </Radio>
            </Tile>
          ))}
        </RadioGroup>
        <FormFieldError>Pick a trend.</FormFieldError>
      </FormField>

      <div className="actions">
        <Button type="submit">Submit Vote</Button>
      </div>

      {progress}

      {isFacilitator && voteCount > 0 && (
        <div className="actions">
          <Button
            type="button"
            variant={BUTTON_VARIANT.outline}
            onClick={onRevealVotes}
          >
            Reveal Votes Now ({voteCount}/{totalParticipants})
          </Button>
        </div>
      )}
    </form>
  );
}

export default VotingPanel;

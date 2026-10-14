import { useState } from 'react';
import {
  Button,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  Radio,
  RadioControl,
  RadioGroup,
  RadioLabel,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { RangeVote, VoteTrend } from '../types';
import { MAX_SCORE, MIN_SCORE, medianScore, scoreCounts, trendCounts } from '../lib/voteScore';
import { t as messages } from '../lib/i18n';
import { TREND_OPTIONS_WORST_FIRST } from './voteOptions';

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i);

interface Props {
  votes: RangeVote[];
  compact?: boolean;
  /** The facilitator's votes for people without the app, already in `votes`: only these can be removed */
  offlineVotes?: RangeVote[];
  /** Shows + and − under each score to add or remove an offline vote */
  onAdjust?: (vote: RangeVote, delta: 1 | -1) => void;
}

/**
 * Votes per score from 1 to 9 as bars, the median marked (both neighbours when it is a half),
 * and the trend counts below. The counts are text, so the bars are decoration for the eye only.
 */
function ScoreHistogram({ votes, compact = false, offlineVotes = [], onAdjust }: Props) {
  /* The trend of the votes the facilitator adds with +: a vote has a score and a trend */
  const [addTrend, setAddTrend] = useState<VoteTrend>('stable');
  const counts = scoreCounts(votes);
  const added = scoreCounts(offlineVotes);
  const trends = trendCounts(votes);
  const median = medianScore(votes);
  const medians = median === null ? [] : [...new Set([Math.floor(median), Math.ceil(median)])];
  const max = Math.max(1, ...counts);
  const trendLabel = (trend: VoteTrend) => TREND_OPTIONS_WORST_FIRST.find((o) => o.value === trend)!.label;
  /* Removing prefers an added vote of the chosen trend, else any added vote of that score */
  const removable = (score: number) =>
    offlineVotes.find((v) => v.score === score && v.trend === addTrend) ??
    offlineVotes.find((v) => v.score === score);

  return (
    <div className={compact ? 'stack score-histogram score-histogram--compact' : 'stack score-histogram'}>
      <table className="score-histogram__table">
        <caption className="visually-hidden">{messages.results.histogramCaption}</caption>
        <thead>
          <tr>
            {SCORES.map((score) => (
              <th key={score} scope="col" className="score-histogram__score">
                <Text preset={compact ? TEXT_PRESET.label : TEXT_PRESET.heading5} as="span">{score}</Text>
                {medians.includes(score) && (
                  <>
                    <span className="score-histogram__median" aria-hidden="true">▲</span>
                    <span className="visually-hidden"> ({messages.results.median})</span>
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {SCORES.map((score) => {
              const n = counts[score - MIN_SCORE];
              const manual = added[score - MIN_SCORE];
              const removal = removable(score);
              return (
                <td key={score} className="score-histogram__cell">
                  <span className="score-histogram__bars" aria-hidden="true">
                    <span
                      className={
                        medians.includes(score)
                          ? 'score-histogram__bar score-histogram__bar--median'
                          : 'score-histogram__bar'
                      }
                      style={{ '--bar-height': `${(n / max) * 100}%` } as React.CSSProperties}
                    />
                  </span>
                  <span className="score-histogram__count">
                    <Text preset={n ? (compact ? TEXT_PRESET.label : TEXT_PRESET.heading4) : TEXT_PRESET.caption} as="span">
                      {n}
                    </Text>
                    {manual > 0 && (
                      <span className="vote-matrix__manual" title={messages.facilitator.offlineScoreInCell(manual)}>
                        <Icon name={ICON_NAME.pen} aria-hidden="true" />
                        <span className="visually-hidden">{messages.facilitator.offlineScoreInCell(manual)}</span>
                      </span>
                    )}
                  </span>
                  {onAdjust && (
                    <span className="inline vote-matrix__adjust">
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        disabled={!removal}
                        aria-label={messages.facilitator.removeOfflineScore(score, trendLabel(removal?.trend ?? addTrend))}
                        title={messages.facilitator.removeOfflineScore(score, trendLabel(removal?.trend ?? addTrend))}
                        onClick={() => removal && onAdjust(removal, -1)}
                      >
                        <Icon name={ICON_NAME.minus} />
                      </Button>
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        aria-label={messages.facilitator.addOfflineScore(score, trendLabel(addTrend))}
                        title={messages.facilitator.addOfflineScore(score, trendLabel(addTrend))}
                        onClick={() => onAdjust({ score, trend: addTrend }, 1)}
                      >
                        <Icon name={ICON_NAME.plus} />
                      </Button>
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <ul className="inline wrap score-histogram__trends" aria-label={messages.results.trendsCaption}>
        {TREND_OPTIONS_WORST_FIRST.map(({ value, label, icon }) => (
          <li key={value} className="inline score-histogram__trend">
            <Icon name={icon} aria-hidden="true" />
            <Text preset={TEXT_PRESET.paragraph} as="span">{label}: {trends[value]}</Text>
          </li>
        ))}
      </ul>

      {onAdjust && (
        <RadioGroup
          className="score-histogram__add-trend"
          orientation="horizontal"
          aria-label={messages.facilitator.offlineTrend}
          value={addTrend}
          onValueChange={({ value }) => setAddTrend(value as VoteTrend)}
        >
          {TREND_OPTIONS_WORST_FIRST.map(({ value, label, icon }) => (
            <Radio key={value} value={value}>
              <RadioControl />
              <RadioLabel>
                <Icon name={icon} aria-hidden="true" />
                <span>{label}</span>
              </RadioLabel>
            </Radio>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}

export default ScoreHistogram;

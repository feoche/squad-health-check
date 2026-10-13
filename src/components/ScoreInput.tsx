import { useId } from 'react';
import { Range, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category } from '../types';
import { MAX_SCORE, MIN_SCORE } from '../lib/voteScore';
import { t } from '../lib/i18n';
import { scoreEnds } from './voteOptions';

interface Props {
  category: Category;
  /** Null until the voter touches the slider: the thumb then waits in the middle without being a vote */
  score: number | null;
  invalid: boolean;
  onChange: (score: number) => void;
}

const WAITING = Math.round((MIN_SCORE + MAX_SCORE) / 2);
const TICKS = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i);
const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * The score picker: an ODS Range from 1 to 9, the 1 and 9 worded by the category.
 * A Range always shows a thumb, so touching it (pointer or arrow keys) is what counts as picking:
 * the capture handlers record the waiting value first, then the Range's own change replaces it.
 */
function ScoreInput({ category, score, invalid, onChange }: Props) {
  const { low, high } = scoreEnds(category);
  const statusId = useId();
  const touch = () => {
    if (score === null) onChange(WAITING);
  };

  return (
    <div className="score-input">
      <div className="score-input__ends">
        <div className="score-input__end">
          <Text preset={TEXT_PRESET.label} as="span">{t.voting.scaleLow}</Text>
          <Text preset={TEXT_PRESET.paragraph} className="score-input__description">{low}</Text>
        </div>
        <div className="score-input__end score-input__end--high">
          <Text preset={TEXT_PRESET.label} as="span">{t.voting.scaleHigh}</Text>
          <Text preset={TEXT_PRESET.paragraph} className="score-input__description">{high}</Text>
        </div>
      </div>
      {/* Only a press on the slider or a move key with focus on it counts as touching it */}
      <div onPointerUp={touch} onKeyDownCapture={(e) => MOVE_KEYS.has(e.key) && touch()}>
        <Range
          aria-label={[t.voting.scoreLabel]}
          aria-describedby={statusId}
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={1}
          ticks={TICKS}
          displayBounds
          invalid={invalid}
          value={[score ?? WAITING]}
          onDragging={({ value }) => onChange(value[0])}
          onValueChange={({ value }) => onChange(value[0])}
        />
      </div>
      <Text preset={TEXT_PRESET.heading4} as="output" id={statusId} className="score-input__value" role="status">
        {score === null ? t.voting.scoreNone : t.voting.scoreValue(score)}
      </Text>
    </div>
  );
}

export default ScoreInput;

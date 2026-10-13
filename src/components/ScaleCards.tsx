import { Card, CARD_COLOR, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category } from '../types';
import { MAX_SCORE, MIN_SCORE } from '../lib/voteScore';
import { scoreEnds } from './voteOptions';

/** What the two ends of the 1–9 scale mean, for a category or, without one, in general terms. `large` for the shared screen. */
function ScaleCards({ category, large = false }: { category?: Category; large?: boolean }) {
  const { low, high } = scoreEnds(category);
  return (
    <div className={large ? 'grid-2 scale-cards scale-cards--large' : 'grid-2 scale-cards'}>
      {[
        { score: MIN_SCORE, text: low },
        { score: MAX_SCORE, text: high },
      ].map(({ score, text }) => (
        <Card key={score} className="card-body card-compact scale-cards__card" color={CARD_COLOR.neutral}>
          <Text preset={large ? TEXT_PRESET.heading2 : TEXT_PRESET.heading4} as="span" className="scale-cards__score">
            {score}
          </Text>
          <Text preset={TEXT_PRESET.paragraph}>{text}</Text>
        </Card>
      ))}
    </div>
  );
}

export default ScaleCards;

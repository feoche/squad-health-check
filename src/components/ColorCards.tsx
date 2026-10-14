import { Badge, BADGE_SIZE, Card, CARD_COLOR, type CardColor, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category } from '../types';
import { COLOR_OPTIONS, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

const CARD_COLORS: Record<'green' | 'red', CardColor> = {
  green: CARD_COLOR.success,
  red: CARD_COLOR.critical,
};

/**
 * The two extreme health colours, described for a category or, without one, in general terms;
 * orange has no description, so the discussion stays on the extremes.
 * `large` sizes them for the shared screen, where they are what the voters read.
 */
function ColorCards({
  category,
  large = false,
}: {
  category?: Category;
  large?: boolean;
}) {
  const options = COLOR_OPTIONS.filter((o): o is typeof o & { value: 'green' | 'red' } => o.value !== 'orange');
  return (
    <div className={`grid-2 color-cards${large ? ' color-cards--large' : ''}`}>
      {options.map((option) => (
        <Card
          key={option.value}
          className={`card-body card-compact color-cards__card color-cards__card--${option.value}`}
          color={CARD_COLORS[option.value]}
        >
          <Badge
            className="self-start color-cards__badge"
            color={option.badge}
            size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}
          >
            {option.label}
          </Badge>
          <Text preset={TEXT_PRESET.paragraph} className="color-cards__text">
            {category ? colorDescription(category, option) : t.colorFallbacks[option.value]}
          </Text>
        </Card>
      ))}
    </div>
  );
}

export default ColorCards;

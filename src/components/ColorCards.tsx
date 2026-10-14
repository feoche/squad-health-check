import { Badge, BADGE_SIZE, Card, CARD_COLOR, type CardColor, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category, VoteColor } from '../types';
import { COLOR_OPTIONS, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

const CARD_COLORS: Record<VoteColor, CardColor> = {
  green: CARD_COLOR.success,
  orange: CARD_COLOR.warning,
  red: CARD_COLOR.critical,
};

/**
 * The three health colours, described for a category or, without one, in general terms.
 * `large` sizes them for the shared screen, where they are what the voters read.
 * `only` limits them to some colors, in the order given.
 */
function ColorCards({
  category,
  large = false,
  only,
}: {
  category?: Category;
  large?: boolean;
  only?: VoteColor[];
}) {
  const options = only ? only.map((color) => COLOR_OPTIONS.find((o) => o.value === color)!) : COLOR_OPTIONS;
  const grid = options.length === 2 ? 'grid-2' : 'grid-3';
  return (
    <div className={`${grid} color-cards${large ? ' color-cards--large' : ''}`}>
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

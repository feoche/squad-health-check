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
 */
function ColorCards({ category, large = false }: { category?: Category; large?: boolean }) {
  return (
    <div className={large ? 'grid-3 color-cards color-cards--large' : 'grid-3 color-cards'}>
      {COLOR_OPTIONS.map((option) => (
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

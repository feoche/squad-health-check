import { Badge, Card, CARD_COLOR, type CardColor, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category, VoteColor } from '../types';
import { COLOR_OPTIONS, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

const CARD_COLORS: Record<VoteColor, CardColor> = {
  green: CARD_COLOR.success,
  orange: CARD_COLOR.warning,
  red: CARD_COLOR.critical,
};

/** The three health colours, described for a category or, without one, in general terms. */
function ColorCards({ category }: { category?: Category }) {
  return (
    <div className="grid-3">
      {COLOR_OPTIONS.map((option) => (
        <Card key={option.value} className="card-body card-compact" color={CARD_COLORS[option.value]}>
          <Badge className="self-start" color={option.badge}>{option.label}</Badge>
          <Text preset={TEXT_PRESET.paragraph}>
            {category ? colorDescription(category, option) : t.colorFallbacks[option.value]}
          </Text>
        </Card>
      ))}
    </div>
  );
}

export default ColorCards;

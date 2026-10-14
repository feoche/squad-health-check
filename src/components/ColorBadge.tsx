import { Fragment } from 'react';
import { Badge, BADGE_SIZE } from '@ovhcloud/ods-react';
import { VoteColor } from '../types';
import { COLOR_OPTIONS } from './voteOptions';

/** The name of a health colour ("Green", "Orange", "Red") as an ODS badge in that colour */
function ColorBadge({ color, large = false }: { color: VoteColor; large?: boolean }) {
  const option = COLOR_OPTIONS.find((o) => o.value === color)!;
  return (
    <Badge color={option.badge} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
      {option.label}
    </Badge>
  );
}

/** A text where `{green}`, `{orange}` and `{red}` stand for the colour badges, e.g. "{green} doesn't mean perfect" */
export function withColorBadges(text: string) {
  return text.split(/\{(green|orange|red)\}/).map((part, i) =>
    i % 2 ? <ColorBadge key={i} color={part as VoteColor} /> : <Fragment key={i}>{part}</Fragment>,
  );
}

export default ColorBadge;

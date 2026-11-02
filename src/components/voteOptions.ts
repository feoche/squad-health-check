import { BADGE_COLOR, ICON_NAME, type BadgeColor, type IconName } from '@ovhcloud/ods-react';
import { Category, VoteColor, VoteTrend } from '../types';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

/** Adds a `label` read from the current messages, so options follow language switches */
function withLabels<V extends string, T extends { value: V }>(
  options: T[],
  labels: () => Record<V, string>,
): (T & { readonly label: string })[] {
  return options.map((option) =>
    Object.defineProperty(option, 'label', { get: () => labels()[option.value], enumerable: true }),
  ) as (T & { readonly label: string })[];
}

export const COLOR_OPTIONS = withLabels<
  VoteColor,
  {
    value: VoteColor;
    /** Category field describing this color; orange has none and is not described anywhere */
    field?: 'positiveDescription' | 'negativeDescription';
    badge: BadgeColor;
  }
>(
  [
    { value: 'green', field: 'positiveDescription', badge: BADGE_COLOR.success },
    { value: 'orange', badge: BADGE_COLOR.warning },
    { value: 'red', field: 'negativeDescription', badge: BADGE_COLOR.critical },
  ],
  () => t.colors,
);

/** Worst first, like the trends, for choices read left to right */
export const COLOR_OPTIONS_WORST_FIRST = [...COLOR_OPTIONS].reverse();

/** Description in the user's language, or a generic one when the category leaves it empty */
export function colorDescription(
  category: Category,
  option: (typeof COLOR_OPTIONS)[number] & { value: 'green' | 'red' },
): string {
  return (option.field && localizeCategory(category)[option.field]?.trim()) || t.colorFallbacks[option.value];
}

export const TREND_OPTIONS = withLabels<VoteTrend, { value: VoteTrend; icon: IconName }>(
  [
    { value: 'up', icon: ICON_NAME.arrowUpRight },
    { value: 'stable', icon: ICON_NAME.arrowRight },
    { value: 'down', icon: ICON_NAME.arrowDownRight },
  ],
  () => t.trends,
);

/** Worsening first, improving last, for scales read left to right. */
export const TREND_OPTIONS_WORST_FIRST = [...TREND_OPTIONS].reverse();

/** What 1 and 9 mean in a category: its negative and positive descriptions, or generic ones without a category */
export function scoreEnds(category?: Category): { low: string; high: string } {
  const localized = category && localizeCategory(category);
  return {
    low: localized?.negativeDescription?.trim() || t.colorFallbacks.red,
    high: localized?.positiveDescription?.trim() || t.colorFallbacks.green,
  };
}

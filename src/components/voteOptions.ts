import { BADGE_COLOR, ICON_NAME, type BadgeColor, type IconName } from '@ovhcloud/ods-react';
import { Category, VoteColor, VoteTrend } from '../types';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

export const COLOR_OPTIONS: {
  value: VoteColor;
  label: string;
  /** Category field describing this color */
  field: 'positiveDescription' | 'mixedDescription' | 'negativeDescription';
  badge: BadgeColor;
}[] = [
  { value: 'green', label: t.colors.green, field: 'positiveDescription', badge: BADGE_COLOR.success },
  { value: 'orange', label: t.colors.orange, field: 'mixedDescription', badge: BADGE_COLOR.warning },
  { value: 'red', label: t.colors.red, field: 'negativeDescription', badge: BADGE_COLOR.critical },
];

/** Description in the user's language, or a generic one when the category leaves it empty */
export function colorDescription(
  category: Category,
  option: (typeof COLOR_OPTIONS)[number],
): string {
  return localizeCategory(category)[option.field]?.trim() || t.colorFallbacks[option.value];
}

export const TREND_OPTIONS: {
  value: VoteTrend;
  label: string;
  icon: IconName;
}[] = [
  { value: 'up', label: t.trends.up, icon: ICON_NAME.arrowUpRight },
  { value: 'stable', label: t.trends.stable, icon: ICON_NAME.arrowRight },
  { value: 'down', label: t.trends.down, icon: ICON_NAME.arrowDownRight },
];

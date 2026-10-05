import { BADGE_COLOR, ICON_NAME, type BadgeColor, type IconName } from '@ovhcloud/ods-react';
import { Category, VoteColor, VoteTrend } from '../types';

export const COLOR_OPTIONS: {
  value: VoteColor;
  label: string;
  /** Category field describing this color */
  field: 'positiveDescription' | 'mixedDescription' | 'negativeDescription';
  /** Used when the category leaves its description empty */
  fallback: string;
  badge: BadgeColor;
}[] = [
  { value: 'green', label: 'Green', field: 'positiveDescription', fallback: 'Happy with it', badge: BADGE_COLOR.success },
  { value: 'orange', label: 'Orange', field: 'mixedDescription', fallback: 'Issues to handle', badge: BADGE_COLOR.warning },
  { value: 'red', label: 'Red', field: 'negativeDescription', fallback: 'Needs improvement', badge: BADGE_COLOR.critical },
];

export function colorDescription(
  category: Category,
  option: (typeof COLOR_OPTIONS)[number],
): string {
  return category[option.field]?.trim() || option.fallback;
}

export const TREND_OPTIONS: {
  value: VoteTrend;
  label: string;
  icon: IconName;
}[] = [
  { value: 'up', label: 'Improving', icon: ICON_NAME.arrowUpRight },
  { value: 'stable', label: 'Stable', icon: ICON_NAME.arrowRight },
  { value: 'down', label: 'Getting worse', icon: ICON_NAME.arrowDownRight },
];

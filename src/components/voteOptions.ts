import { BADGE_COLOR, ICON_NAME, type BadgeColor, type IconName } from '@ovhcloud/ods-react';
import { VoteColor, VoteTrend } from '../types';

export const COLOR_OPTIONS: {
  value: VoteColor;
  label: string;
  description: string;
  badge: BadgeColor;
}[] = [
  { value: 'green', label: 'Green', description: 'Happy with it', badge: BADGE_COLOR.success },
  { value: 'orange', label: 'Orange', description: 'Issues to handle', badge: BADGE_COLOR.warning },
  { value: 'red', label: 'Red', description: 'Needs improvement', badge: BADGE_COLOR.critical },
];

export const TREND_OPTIONS: {
  value: VoteTrend;
  label: string;
  icon: IconName;
}[] = [
  { value: 'up', label: 'Improving', icon: ICON_NAME.arrowUpRight },
  { value: 'stable', label: 'Stable', icon: ICON_NAME.arrowRight },
  { value: 'down', label: 'Getting worse', icon: ICON_NAME.arrowDownRight },
];

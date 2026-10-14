import { Category } from '../types';
import { ourCategories, ourExtraCategories } from './ourCategories';
import { spotifyCategories, spotifyExtraCategories } from './spotifyCategories';

/** The default selection stays within this many categories, so the workshop fits its time box */
export const RECOMMENDED_MAX_CATEGORIES = 10;

/** The two built-in category sets the facilitator can start from */
export const CATEGORY_PRESETS = ['ours', 'spotify'] as const;
export type CategoryPreset = (typeof CATEGORY_PRESETS)[number];

interface PresetCategories {
  /** Selected when the preset is picked */
  selected: Category[];
  /** The rest of the set, suggested but not selected */
  extra: Category[];
}

export const presetCategories: Record<CategoryPreset, PresetCategories> = {
  ours: { selected: ourCategories, extra: ourExtraCategories },
  spotify: { selected: spotifyCategories, extra: spotifyExtraCategories },
};

/** What new sessions start with */
export const defaultCategories = ourCategories;

/** Every built-in category of both sets, without the ones the sets share */
export const builtInCategories: Category[] = [
  ...new Map(
    CATEGORY_PRESETS.flatMap((p) => [...presetCategories[p].selected, ...presetCategories[p].extra]).map(
      (c) => [c.name, c],
    ),
  ).values(),
];

/** The preset a selection comes from: the one it shares the most categories with, ours on a tie */
export function detectPreset(categories: Category[]): CategoryPreset {
  const names = new Set(categories.map((c) => c.name));
  const shared = (p: CategoryPreset) => presetCategories[p].selected.filter((c) => names.has(c.name)).length;
  return shared('spotify') > shared('ours') ? 'spotify' : 'ours';
}

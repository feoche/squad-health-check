import { Category } from '../types';
import { builtInCategories } from '../data/defaultCategories';

const builtInNames = new Set(builtInCategories.map((c) => c.name));

/** Whether the category ships with the app (matched by English name, so edits keep it built-in) */
export const isBuiltInCategory = (category: Category) => builtInNames.has(category.name);

/**
 * Built-in categories, then removed custom ones, that are not selected. Matched by English
 * name: an edited category counts as selected, and a removed one comes back with its edits.
 */
export function suggestedCategories(selected: Category[], removed: Category[] = []): Category[] {
  const selectedNames = new Set(selected.map((c) => c.name));
  const removedByName = new Map(removed.map((c) => [c.name, c]));
  return [
    ...builtInCategories.map((c) => removedByName.get(c.name) ?? c),
    ...[...removedByName.values()].filter((c) => !isBuiltInCategory(c)),
  ].filter((c) => !selectedNames.has(c.name));
}

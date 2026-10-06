import { describe, it, expect } from 'vitest';
import { suggestedCategories } from './suggestedCategories';
import { builtInCategories, defaultCategories, extraCategories } from '../data/defaultCategories';

describe('suggestedCategories', () => {
  it('suggests the extra categories next to the default selection', () => {
    expect(suggestedCategories(defaultCategories)).toEqual(extraCategories);
  });

  it('suggests a removed built-in category again, in built-in order', () => {
    const [first, ...rest] = defaultCategories;
    expect(suggestedCategories(rest)).toEqual([first, ...extraCategories]);
  });

  it('does not suggest a category already selected, even after it was edited', () => {
    const edited = { ...extraCategories[0], positiveDescription: 'Our own wording' };
    expect(suggestedCategories([edited])).not.toContainEqual(extraCategories[0]);
  });

  it('suggests nothing once every built-in category is selected', () => {
    expect(suggestedCategories(builtInCategories)).toEqual([]);
  });

  it('suggests a removed custom category after the built-in ones', () => {
    const custom = { name: 'Autonomy', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' };
    expect(suggestedCategories(defaultCategories, [custom])).toEqual([...extraCategories, custom]);
  });

  it('suggests a removed built-in category with its edits, in built-in order', () => {
    const [first, ...rest] = defaultCategories;
    const edited = { ...first, positiveDescription: 'Our own wording' };
    expect(suggestedCategories(rest, [edited])).toEqual([edited, ...extraCategories]);
  });

  it('does not suggest a removed category once it is selected again', () => {
    const custom = { name: 'Autonomy', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' };
    expect(suggestedCategories([...defaultCategories, custom], [custom])).toEqual(extraCategories);
  });
});

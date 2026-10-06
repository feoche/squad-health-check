import { describe, it, expect } from 'vitest';
import { RECOMMENDED_MAX_CATEGORIES, builtInCategories, defaultCategories } from './defaultCategories';

describe('defaultCategories', () => {
  it('keeps every color description under 100 characters', () => {
    for (const c of builtInCategories) {
      for (const text of [
        c.positiveDescription,
        c.mixedDescription,
        c.negativeDescription,
        c.positiveDescriptionFr ?? '',
        c.mixedDescriptionFr ?? '',
        c.negativeDescriptionFr ?? '',
      ]) {
        expect(text.length, `${c.name}: ${text}`).toBeLessThan(100);
      }
    }
  });

  it('provides French names and descriptions for every category', () => {
    for (const c of builtInCategories) {
      expect(c.nameFr, c.name).toBeTruthy();
      expect(c.positiveDescriptionFr, c.name).toBeTruthy();
      expect(c.mixedDescriptionFr, c.name).toBeTruthy();
      expect(c.negativeDescriptionFr, c.name).toBeTruthy();
    }
  });

  it('selects no more categories by default than recommended', () => {
    expect(defaultCategories.length).toBeLessThanOrEqual(RECOMMENDED_MAX_CATEGORIES);
  });

  it('gives every built-in category its own name', () => {
    const names = builtInCategories.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

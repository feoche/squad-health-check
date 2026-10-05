import { describe, it, expect } from 'vitest';
import { defaultCategories } from './defaultCategories';

describe('defaultCategories', () => {
  it('keeps every color description under 100 characters', () => {
    for (const c of defaultCategories) {
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
    for (const c of defaultCategories) {
      expect(c.nameFr, c.name).toBeTruthy();
      expect(c.positiveDescriptionFr, c.name).toBeTruthy();
      expect(c.mixedDescriptionFr, c.name).toBeTruthy();
      expect(c.negativeDescriptionFr, c.name).toBeTruthy();
    }
  });
});

import { describe, it, expect } from 'vitest';
import { defaultCategories } from './defaultCategories';

describe('defaultCategories', () => {
  it('keeps every color description under 100 characters', () => {
    for (const c of defaultCategories) {
      for (const text of [c.positiveDescription, c.mixedDescription, c.negativeDescription]) {
        expect(text.length, `${c.name}: ${text}`).toBeLessThan(100);
      }
    }
  });
});

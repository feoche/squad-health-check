import { describe, expect, it } from 'vitest';
import { localizeCategory } from './localizeCategory';
import { defaultCategories } from '../data/categoryPresets';

const learning = {
  name: 'Ownership',
  nameFr: 'Responsabilité',
  positiveDescription: 'p',
 
  negativeDescription: 'n',
  positiveDescriptionFr: 'p-fr',
  negativeDescriptionFr: 'n-fr',
};

describe('localizeCategory', () => {
  it('uses French text for French, keeping the English name as subtitle', () => {
    expect(localizeCategory(learning, 'fr')).toEqual({
      title: 'Responsabilité',
      subtitle: 'Ownership',
      positiveDescription: 'p-fr',
      // no French text: falls back to English
      negativeDescription: 'n-fr',
    });
  });

  it('uses English text for English, with the French name as subtitle', () => {
    expect(localizeCategory(learning, 'en')).toEqual({
      title: 'Ownership',
      subtitle: 'Responsabilité',
      positiveDescription: 'p',
     
      negativeDescription: 'n',
    });
  });

  it('falls back to the English name without subtitle when there is no French name', () => {
    const fun = { name: 'Autonomy', positiveDescription: 'p', negativeDescription: 'n' };
    expect(localizeCategory(fun, 'fr')).toMatchObject({ title: 'Autonomy', subtitle: undefined });
  });

  it('takes French descriptions from the built-in category of the same name when missing', () => {
    const builtIn = defaultCategories[0];
    const stored = {
      name: builtIn.name,
      nameFr: builtIn.nameFr,
      positiveDescription: 'old p',
     
      negativeDescription: 'old n',
    };
    expect(localizeCategory(stored, 'fr')).toMatchObject({
      positiveDescription: builtIn.positiveDescriptionFr,
      negativeDescription: builtIn.negativeDescriptionFr,
    });
    expect(localizeCategory(stored, 'en').positiveDescription).toBe('old p');
  });
});

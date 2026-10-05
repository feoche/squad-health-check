import { describe, expect, it } from 'vitest';
import { localizeCategory } from './localizeCategory';

const learning = {
  name: 'Learning',
  nameFr: 'Apprentissage',
  positiveDescription: 'p',
  mixedDescription: 'm',
  negativeDescription: 'n',
  positiveDescriptionFr: 'p-fr',
  negativeDescriptionFr: 'n-fr',
};

describe('localizeCategory', () => {
  it('uses French text for French, keeping the English name as subtitle', () => {
    expect(localizeCategory(learning, 'fr')).toEqual({
      title: 'Apprentissage',
      subtitle: 'Learning',
      positiveDescription: 'p-fr',
      mixedDescription: 'm', // no French text: falls back to English
      negativeDescription: 'n-fr',
    });
  });

  it('uses English text for English, with the French name as subtitle', () => {
    expect(localizeCategory(learning, 'en')).toEqual({
      title: 'Learning',
      subtitle: 'Apprentissage',
      positiveDescription: 'p',
      mixedDescription: 'm',
      negativeDescription: 'n',
    });
  });

  it('falls back to the English name without subtitle when there is no French name', () => {
    const fun = { name: 'Fun', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' };
    expect(localizeCategory(fun, 'fr')).toMatchObject({ title: 'Fun', subtitle: undefined });
  });
});

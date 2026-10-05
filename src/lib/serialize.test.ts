import { describe, it, expect } from 'vitest';
import { toFirebaseCategories } from './serialize';

describe('toFirebaseCategories', () => {
  it('drops nameFr when undefined or blank', () => {
    const out = toFirebaseCategories([
      { name: 'Fun', nameFr: undefined, positiveDescription: 'yay', mixedDescription: 'm', negativeDescription: 'meh' },
      { name: 'Stress', nameFr: '', positiveDescription: 'calm', mixedDescription: 'm', negativeDescription: 'panic' },
    ]);
    expect(out).toEqual([
      { name: 'Fun', positiveDescription: 'yay', mixedDescription: 'm', negativeDescription: 'meh' },
      { name: 'Stress', positiveDescription: 'calm', mixedDescription: 'm', negativeDescription: 'panic' },
    ]);
    out.forEach((c) => expect('nameFr' in c).toBe(false));
  });

  it('keeps nameFr when set', () => {
    const out = toFirebaseCategories([
      { name: 'Learning', nameFr: 'Apprentissage', positiveDescription: 'a', mixedDescription: 'm', negativeDescription: 'b' },
    ]);
    expect(out[0].nameFr).toBe('Apprentissage');
  });

  it('drops unknown extra keys', () => {
    const input = [{ name: 'X', positiveDescription: 'a', mixedDescription: 'm', negativeDescription: 'b', id: 3 }] as never;
    expect(Object.keys(toFirebaseCategories(input)[0]).sort()).toEqual(
      ['mixedDescription', 'name', 'negativeDescription', 'positiveDescription'],
    );
  });
});

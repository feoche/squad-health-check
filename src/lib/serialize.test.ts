import { describe, it, expect } from 'vitest';
import { toFirebaseCategories } from './serialize';

describe('toFirebaseCategories', () => {
  it('drops nameFr when undefined or blank', () => {
    const out = toFirebaseCategories([
      { name: 'Fun', nameFr: undefined, positiveDescription: 'yay', negativeDescription: 'meh' },
      { name: 'Stress', nameFr: '', positiveDescription: 'calm', negativeDescription: 'panic' },
    ]);
    expect(out).toEqual([
      { name: 'Fun', positiveDescription: 'yay', negativeDescription: 'meh' },
      { name: 'Stress', positiveDescription: 'calm', negativeDescription: 'panic' },
    ]);
    out.forEach((c) => expect('nameFr' in c).toBe(false));
  });

  it('keeps nameFr when set', () => {
    const out = toFirebaseCategories([
      { name: 'Learning', nameFr: 'Apprentissage', positiveDescription: 'a', negativeDescription: 'b' },
    ]);
    expect(out[0].nameFr).toBe('Apprentissage');
  });

  it('drops unknown extra keys', () => {
    const input = [{ name: 'X', positiveDescription: 'a', negativeDescription: 'b', id: 3 }] as never;
    expect(Object.keys(toFirebaseCategories(input)[0]).sort()).toEqual(
      ['name', 'negativeDescription', 'positiveDescription'],
    );
  });
});

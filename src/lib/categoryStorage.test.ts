import { describe, it, expect } from 'vitest';
import { parseStoredCategories } from './categoryStorage';

describe('parseStoredCategories', () => {
  const custom = { name: 'Autonomy', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' };

  it('reads stored categories back', () => {
    expect(parseStoredCategories(JSON.stringify([custom]))).toEqual([custom]);
  });

  it('keeps an empty stored list apart from nothing stored', () => {
    expect(parseStoredCategories('[]')).toEqual([]);
    expect(parseStoredCategories(null)).toBeNull();
  });

  it('ignores a corrupted value', () => {
    expect(parseStoredCategories('{not json')).toBeNull();
    expect(parseStoredCategories('{"name":"Autonomy"}')).toBeNull();
  });

  it('drops entries that are not categories', () => {
    expect(parseStoredCategories(JSON.stringify([custom, 'x', null, { label: 'y' }]))).toEqual([custom]);
  });
});

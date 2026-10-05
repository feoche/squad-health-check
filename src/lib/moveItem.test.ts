import { describe, expect, it } from 'vitest';
import { moveItem } from './moveItem';

describe('moveItem', () => {
  it('moves an item down to the target position', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item up to the target position', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the same list when the positions match or are out of range', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, 0, 5)).toBe(list);
    expect(moveItem(list, -1, 0)).toBe(list);
  });

  it('does not mutate the input', () => {
    const list = ['a', 'b', 'c'];
    moveItem(list, 0, 2);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

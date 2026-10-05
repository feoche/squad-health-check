import { describe, expect, it } from 'vitest';
import { MAX_PARTICIPANTS, freeSlots } from './participantSlots';

describe('freeSlots', () => {
  it('offers every slot in an empty session', () => {
    expect(freeSlots(null).sort((a, b) => a - b)).toEqual(
      Array.from({ length: MAX_PARTICIPANTS }, (_, i) => i),
    );
  });

  it('skips taken slots', () => {
    const free = freeSlots({ 0: 'a', 3: 'b', 14: 'c' });
    expect(free).toHaveLength(MAX_PARTICIPANTS - 3);
    expect(free).not.toContain(0);
    expect(free).not.toContain(3);
    expect(free).not.toContain(14);
  });

  it('is empty once the session is full', () => {
    const taken = Object.fromEntries(
      Array.from({ length: MAX_PARTICIPANTS }, (_, i) => [i, `u${i}`]),
    );
    expect(freeSlots(taken)).toEqual([]);
  });
});

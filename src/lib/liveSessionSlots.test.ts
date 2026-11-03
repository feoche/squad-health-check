import { describe, expect, it } from 'vitest';
import { LIVE_SLOT_LEASE_MS, MAX_LIVE_SESSIONS, freeLiveSlots } from './liveSessionSlots';

const NOW = 1_000_000_000_000;
const recent = { createdAt: NOW - 60_000 };
const all = Array.from({ length: MAX_LIVE_SESSIONS }, (_, i) => i);
const allBut = (...taken: number[]) => all.filter((i) => !taken.includes(i));

describe('freeLiveSlots', () => {
  it('offers ten slots when none is taken', () => {
    expect(MAX_LIVE_SESSIONS).toBe(10);
    expect(freeLiveSlots(null, {}, NOW)).toEqual(all);
    expect(freeLiveSlots({}, {}, NOW)).toHaveLength(MAX_LIVE_SESSIONS);
  });

  it('skips a slot held by a running session', () => {
    expect(freeLiveSlots({ 1: { code: 'AAAAAA' } }, { AAAAAA: recent }, NOW)).toEqual(allBut(1));
  });

  it('frees a slot whose session is finished', () => {
    const holders = { AAAAAA: { ...recent, phase: 'finished' } };
    expect(freeLiveSlots({ 0: { code: 'AAAAAA' } }, holders, NOW)).toContain(0);
  });

  it('frees a slot whose session no longer exists', () => {
    expect(freeLiveSlots({ 0: { code: 'AAAAAA' } }, { AAAAAA: undefined }, NOW)).toContain(0);
  });

  it('frees a slot once its session is older than the lease, not before', () => {
    const slots = { 0: { code: 'AAAAAA' } };
    const atLease = { AAAAAA: { createdAt: NOW - LIVE_SLOT_LEASE_MS } };
    const pastLease = { AAAAAA: { createdAt: NOW - LIVE_SLOT_LEASE_MS - 1 } };
    expect(freeLiveSlots(slots, atLease, NOW)).not.toContain(0);
    expect(freeLiveSlots(slots, pastLease, NOW)).toContain(0);
  });

  it('is empty once every slot is held by a running session', () => {
    const slots = Object.fromEntries(all.map((i) => [i, { code: `CODE${i}A` }]));
    const holders = Object.fromEntries(Object.values(slots).map((s) => [s.code, recent]));
    expect(freeLiveSlots(slots, holders, NOW)).toEqual([]);
  });

  it('reads the array Firebase returns for consecutive keys, with null holes', () => {
    const slots = [{ code: 'AAAAAA' }, null, { code: 'BBBBBB' }];
    const holders = { AAAAAA: recent, BBBBBB: recent };
    expect(freeLiveSlots(slots as never, holders, NOW)).toEqual(allBut(0, 2));
  });
});

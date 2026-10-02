import { describe, it, expect } from 'vitest';
import { Category, ClientSessionState } from '../types';
import {
  RawSession,
  deriveClientState,
  readableVoteIndexes,
  shouldAutoReveal,
  summaryIndexes,
} from './deriveClientState';

const categories: Category[] = [
  { name: 'Fun', positiveDescription: 'p', negativeDescription: 'n' },
  { name: 'Learning', positiveDescription: 'p', negativeDescription: 'n' },
  { name: 'Teamwork', positiveDescription: 'p', negativeDescription: 'n' },
];

function raw(overrides: Partial<RawSession> = {}): RawSession {
  return {
    meta: { facilitatorId: 'fac', categories, createdAt: 1 },
    state: { phase: 'lobby', currentCategoryIndex: 0 },
    participants: { fac: { name: 'Alice' }, bob: { name: 'Bob' } },
    voters: null,
    votes: null,
    facilitator: null,
    closed: null,
    ...overrides,
  };
}

describe('deriveClientState', () => {
  it('returns null until meta and state are loaded', () => {
    expect(deriveClientState('ABC234', raw({ meta: null }), 'fac')).toBeNull();
    expect(deriveClientState('ABC234', raw({ state: null }), 'fac')).toBeNull();
  });

  it('maps lobby state with identity fields', () => {
    const s = deriveClientState('ABC234', raw(), 'fac')!;
    expect(s.code).toBe('ABC234');
    expect(s.phase).toBe('lobby');
    expect(s.categories).toEqual(categories);
    expect(s.isFacilitator).toBe(true);
    expect(s.myId).toBe('fac');
    expect(s.facilitatorId).toBe('fac');
    expect(s.totalParticipants).toBe(2);
    expect(s.voteCount).toBe(0);
    expect(s.hasVoted).toBe(false);
    expect(s.currentResults).toBeNull();
    expect(s.allResults).toEqual([]);
    expect(s.facilitatorNotes).toEqual({});
    expect(s.categoryResults).toEqual({});
  });

  it('sorts participants by name and handles none', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ participants: { z: { name: 'Zoe' }, a: { name: 'adam' }, m: { name: 'Mia' } } }),
      'a',
    )!;
    expect(s.participants.map((p) => p.name)).toEqual(['adam', 'Mia', 'Zoe']);
    expect(s.isFacilitator).toBe(false);

    const empty = deriveClientState('ABC234', raw({ participants: null }), 'x')!;
    expect(empty.participants).toEqual([]);
    expect(empty.totalParticipants).toBe(0);
  });

  it('counts voters of the current category only and sets hasVoted', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'voting', currentCategoryIndex: 1 },
        voters: { '0': { fac: true, bob: true }, '1': { bob: true } },
      }),
      'bob',
    )!;
    expect(s.voteCount).toBe(1);
    expect(s.hasVoted).toBe(true);
    expect(s.currentResults).toBeNull();
  });

  it('reads sparse arrays the same way as objects (RTDB integer keys)', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'revealed', currentCategoryIndex: 2 },
        voters: [null, undefined, { fac: true, bob: true }],
        votes: [null, null, { k1: { color: 'green', trend: 'up' }, k2: { color: 'red', trend: 'down' } }],
        facilitator: [null, { notes: 'about learning' }, { takeaway: 'teamwork ok' }],
      }),
      'fac',
    )!;
    expect(s.voteCount).toBe(2);
    expect(s.currentResults).toHaveLength(2);
    expect(s.currentResults).toContainEqual({ color: 'green', trend: 'up' });
    expect(s.facilitatorNotes).toEqual({
      1: { notes: 'about learning', takeaway: '' },
      2: { notes: '', takeaway: 'teamwork ok' },
    });
  });

  it('returns an empty result list when revealed with a loaded, empty round', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ state: { phase: 'revealed', currentCategoryIndex: 0 }, votes: { '0': {} } }),
      'fac',
    )!;
    expect(s.currentResults).toEqual([]);
  });

  it('returns null results when revealed but votes have not loaded', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ state: { phase: 'revealed', currentCategoryIndex: 0 }, votes: null }),
      'fac',
    )!;
    expect(s.currentResults).toBeNull();
  });

  it('builds allResults without notes for participants when finished', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'finished', currentCategoryIndex: 1 },
        votes: { '0': { k: { color: 'orange', trend: 'stable' } } },
        facilitator: { '0': { notes: 'fun notes', takeaway: 'keep it up' } },
      }),
      'bob',
    )!;
    expect(s.allResults).toEqual([
      { categoryIndex: 0, votes: [{ color: 'orange', trend: 'stable' }], notes: '', takeaway: '' },
      { categoryIndex: 1, votes: [], notes: '', takeaway: '' },
      { categoryIndex: 2, votes: [], notes: '', takeaway: '' },
    ]);
    expect(s.facilitatorNotes).toEqual({});
  });

  it('builds allResults with notes and takeaways for the facilitator when finished', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'finished', currentCategoryIndex: 1 },
        votes: { '0': { k: { color: 'orange', trend: 'stable' } } },
        facilitator: { '0': { notes: 'fun notes', takeaway: 'keep it up' }, '2': { takeaway: 'pair more' } },
      }),
      'fac',
    )!;
    expect(s.allResults).toEqual([
      { categoryIndex: 0, votes: [{ color: 'orange', trend: 'stable' }], notes: 'fun notes', takeaway: 'keep it up' },
      { categoryIndex: 1, votes: [], notes: '', takeaway: '' },
      { categoryIndex: 2, votes: [], notes: '', takeaway: 'pair more' },
    ]);
  });

  it('ignores empty facilitator entries', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ facilitator: { '0': { notes: '', takeaway: '' } } }),
      'fac',
    )!;
    expect(s.facilitatorNotes).toEqual({});
  });

  it('exposes the votes of every loaded category in categoryResults', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'revealed', currentCategoryIndex: 2 },
        votes: {
          '0': { k1: { color: 'red', trend: 'down' } },
          '2': { k2: { color: 'green', trend: 'up' } },
        },
      }),
      'fac',
    )!;
    expect(s.categoryResults).toEqual({
      0: [{ color: 'red', trend: 'down' }],
      2: [{ color: 'green', trend: 'up' }],
    });
  });

  describe('facilitatorNotesLoaded', () => {
    it('is false for the facilitator until the notes snapshot arrived', () => {
      const s = deriveClientState('ABC234', raw({ facilitator: undefined }), 'fac')!;
      expect(s.facilitatorNotesLoaded).toBe(false);
    });

    it('is true for the facilitator once the notes snapshot arrived empty', () => {
      const s = deriveClientState('ABC234', raw({ facilitator: null }), 'fac')!;
      expect(s.facilitatorNotesLoaded).toBe(true);
    });

    it('is always false for participants', () => {
      const s = deriveClientState(
        'ABC234',
        raw({ facilitator: { '0': { notes: 'x' } } }),
        'bob',
      )!;
      expect(s.facilitatorNotesLoaded).toBe(false);
    });
  });
});

describe('readableVoteIndexes', () => {
  it('reads nothing in lobby or during voting', () => {
    expect(readableVoteIndexes({ phase: 'lobby', currentCategoryIndex: 0 }, 3)).toEqual([]);
    expect(readableVoteIndexes({ phase: 'voting', currentCategoryIndex: 2 }, 3)).toEqual([]);
  });

  it('reads only the current category when revealed', () => {
    expect(readableVoteIndexes({ phase: 'revealed', currentCategoryIndex: 1 }, 3)).toEqual([1]);
  });

  it('reads every category when finished', () => {
    expect(readableVoteIndexes({ phase: 'finished', currentCategoryIndex: 0 }, 3)).toEqual([0, 1, 2]);
  });

  it('adds closed categories for the facilitator only', () => {
    const state = { phase: 'revealed' as const, currentCategoryIndex: 2 };
    expect(readableVoteIndexes(state, 3, { '0': true, '1': true }, true)).toEqual([0, 1, 2]);
    expect(readableVoteIndexes(state, 3, { '0': true, '1': true }, false)).toEqual([2]);
  });

  it('handles closed categories past index 9 and sparse arrays', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 11 };
    expect(readableVoteIndexes(voting, 12, { '0': true, '10': true }, true)).toEqual([0, 10]);
    expect(readableVoteIndexes(voting, 12, [true, null, true], true)).toEqual([0, 2]);
  });
});

describe('summaryIndexes', () => {
  it('lists nothing in the lobby', () => {
    expect(summaryIndexes({ phase: 'lobby', currentCategoryIndex: 0, categories })).toEqual([]);
  });

  it('lists categories before the current one while voting or revealed', () => {
    expect(summaryIndexes({ phase: 'voting', currentCategoryIndex: 2, categories })).toEqual([0, 1]);
    expect(summaryIndexes({ phase: 'revealed', currentCategoryIndex: 0, categories })).toEqual([]);
  });

  it('lists every category when finished', () => {
    expect(summaryIndexes({ phase: 'finished', currentCategoryIndex: 1, categories })).toEqual([0, 1, 2]);
  });
});

describe('shouldAutoReveal', () => {
  const base = deriveClientState(
    'ABC234',
    raw({ state: { phase: 'voting', currentCategoryIndex: 0 }, voters: { '0': { fac: true, bob: true } } }),
    'fac',
  ) as ClientSessionState;

  it('fires for the facilitator when everyone voted', () => {
    expect(shouldAutoReveal(base)).toBe(true);
  });

  it('does not fire for participants', () => {
    expect(shouldAutoReveal({ ...base, isFacilitator: false })).toBe(false);
  });

  it('does not fire while votes are missing', () => {
    expect(shouldAutoReveal({ ...base, voteCount: 1 })).toBe(false);
  });

  it('does not fire with zero participants', () => {
    expect(shouldAutoReveal({ ...base, voteCount: 0, totalParticipants: 0 })).toBe(false);
  });

  it('does not fire outside the voting phase', () => {
    expect(shouldAutoReveal({ ...base, phase: 'revealed' })).toBe(false);
  });
});


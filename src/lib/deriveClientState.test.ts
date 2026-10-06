import { describe, it, expect } from 'vitest';
import { Category, ClientSessionState } from '../types';
import {
  RawSession,
  canStartWorkshop,
  deriveClientState,
  readableBallotIndexes,
  readableVoteIndexes,
  sharedNamedVotes,
  shouldAutoReveal,
  summaryIndexes,
} from './deriveClientState';

const categories: Category[] = [
  { name: 'Fun', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
  { name: 'Learning', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
  { name: 'Teamwork', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
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
    ballots: {},
    roundBallots: {},
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
    expect(s.totalVoters).toBe(2);
    expect(s.voteCount).toBe(0);
    expect(s.hasVoted).toBe(false);
    expect(s.currentResults).toBeNull();
    expect(s.allResults).toEqual([]);
    expect(s.facilitatorNotes).toEqual({});
    expect(s.categoryResults).toEqual({});
  });

  it('exposes my vote of the current round from my ballot only', () => {
    const ballots = { 1: { key: 'k'.repeat(20), color: 'red' as const, trend: 'down' as const } };
    const voting = { phase: 'voting' as const, currentCategoryIndex: 1 };
    expect(deriveClientState('ABC234', raw({ state: voting, ballots }), 'bob')!.myVote).toEqual({
      color: 'red',
      trend: 'down',
    });
    const nextRound = { ...voting, currentCategoryIndex: 2 };
    expect(deriveClientState('ABC234', raw({ state: nextRound, ballots }), 'bob')!.myVote).toBeNull();
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
    expect(empty.totalVoters).toBe(0);
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
        facilitator: [null, { notes: 'about learning' }, { notes: 'teamwork ok' }],
      }),
      'fac',
    )!;
    expect(s.voteCount).toBe(2);
    expect(s.currentResults).toHaveLength(2);
    expect(s.currentResults).toContainEqual({ color: 'green', trend: 'up' });
    expect(s.facilitatorNotes).toEqual({
      1: { notes: 'about learning' },
      2: { notes: 'teamwork ok' },
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

  it('gives the facilitator live results during voting, never participants', () => {
    const r = raw({
      state: { phase: 'voting', currentCategoryIndex: 0 },
      votes: { '0': { k1: { color: 'green', trend: 'up' } } },
    });
    expect(deriveClientState('ABC234', r, 'fac')!.liveResults).toEqual([{ color: 'green', trend: 'up' }]);
    expect(deriveClientState('ABC234', r, 'bob')!.liveResults).toBeNull();
    expect(deriveClientState('ABC234', r, 'fac')!.currentResults).toBeNull();
  });

  it('builds allResults without notes for participants when finished', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'finished', currentCategoryIndex: 1 },
        votes: { '0': { k: { color: 'orange', trend: 'stable' } } },
        facilitator: { '0': { notes: 'fun notes' } },
      }),
      'bob',
    )!;
    expect(s.allResults).toEqual([
      { categoryIndex: 0, votes: [{ color: 'orange', trend: 'stable' }], notes: '' },
      { categoryIndex: 1, votes: [], notes: '' },
      { categoryIndex: 2, votes: [], notes: '' },
    ]);
    expect(s.facilitatorNotes).toEqual({});
  });

  it('builds allResults with notes for the facilitator when finished', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'finished', currentCategoryIndex: 1 },
        votes: { '0': { k: { color: 'orange', trend: 'stable' } } },
        facilitator: { '0': { notes: 'fun notes' }, '2': { notes: 'pair more' } },
      }),
      'fac',
    )!;
    expect(s.allResults).toEqual([
      { categoryIndex: 0, votes: [{ color: 'orange', trend: 'stable' }], notes: 'fun notes' },
      { categoryIndex: 1, votes: [], notes: '' },
      { categoryIndex: 2, votes: [], notes: 'pair more' },
    ]);
  });

  it('ignores empty facilitator entries', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ facilitator: { '0': { notes: '' } } }),
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

  describe('eligible voters', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 0 };

    it('counts the facilitator when facilitatorVotes is absent or true', () => {
      for (const state of [voting, { ...voting, facilitatorVotes: true }]) {
        const s = deriveClientState('ABC234', raw({ state }), 'fac')!;
        expect(s.facilitatorVotes).toBe(true);
        expect(s.totalVoters).toBe(2);
        expect(s.eligibleVoters.map((p) => p.id)).toEqual(['fac', 'bob']);
      }
    });

    it('leaves the facilitator out when facilitatorVotes is false', () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...voting, facilitatorVotes: false } }),
        'bob',
      )!;
      expect(s.facilitatorVotes).toBe(false);
      expect(s.totalVoters).toBe(1);
      expect(s.eligibleVoters.map((p) => p.id)).toEqual(['bob']);
      expect(s.participants).toHaveLength(2);
    });

    it("ignores the facilitator's voter flag when they do not vote", () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...voting, facilitatorVotes: false }, voters: { '0': { fac: true } } }),
        'fac',
      )!;
      expect(s.voteCount).toBe(0);
      expect(s.voterIds).toEqual([]);
    });

    it('lists who voted this round in participant order', () => {
      const s = deriveClientState(
        'ABC234',
        raw({
          state: voting,
          participants: { fac: { name: 'Alice' }, bob: { name: 'Bob' }, cat: { name: 'Cat' } },
          voters: { '0': { cat: true, fac: true } },
        }),
        'fac',
      )!;
      expect(s.voterIds).toEqual(['fac', 'cat']);
      expect(s.voteCount).toBe(2);
    });
  });

  describe('anonymity and named votes', () => {
    const revealed = { phase: 'revealed' as const, currentCategoryIndex: 0 };
    const ballot = (color: 'green' | 'red', trend: 'up' | 'down') => ({ key: 'k'.repeat(20), color, trend });

    it("defaults to 'full' when the setting is absent", () => {
      expect(deriveClientState('ABC234', raw(), 'fac')!.anonymity).toBe('full');
    });

    it('maps ballots to participant names, sorted by name', () => {
      const s = deriveClientState(
        'ABC234',
        raw({
          state: { ...revealed, anonymity: 'off' },
          roundBallots: { '0': { fac: ballot('red', 'down'), bob: ballot('green', 'up') } },
        }),
        'bob',
      )!;
      expect(s.anonymity).toBe('off');
      expect(s.namedVotes).toEqual({
        0: [
          { id: 'fac', name: 'Alice', vote: { color: 'red', trend: 'down' } },
          { id: 'bob', name: 'Bob', vote: { color: 'green', trend: 'up' } },
        ],
      });
    });

    it('keeps a ballot whose voter left, with no name, listed last', () => {
      const s = deriveClientState(
        'ABC234',
        raw({
          state: { ...revealed, anonymity: 'facilitator' },
          roundBallots: { '0': { gone: ballot('red', 'up'), bob: ballot('green', 'up') } },
        }),
        'fac',
      )!;
      expect(s.namedVotes[0].map((v) => v.name)).toEqual(['Bob', null]);
    });

    it('treats a loaded, empty round as no named votes yet', () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...revealed, anonymity: 'off' }, roundBallots: { '0': null } }),
        'fac',
      )!;
      expect(s.namedVotes).toEqual({ 0: [] });
    });

    it("never names votes in a 'full' session, even with ballots loaded", () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...revealed, anonymity: 'full' }, roundBallots: { '0': { bob: ballot('green', 'up') } } }),
        'fac',
      )!;
      expect(s.namedVotes).toEqual({});
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

  it('adds the voted round for the facilitator once they have voted', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 1 };
    expect(readableVoteIndexes(voting, 3, null, true, false)).toEqual([]);
    expect(readableVoteIndexes(voting, 3, null, true, true)).toEqual([1]);
    expect(readableVoteIndexes(voting, 3, null, false, true)).toEqual([]);
  });

  it('adds the voted round right away when the facilitator does not vote', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 1, facilitatorVotes: false };
    expect(readableVoteIndexes(voting, 3, null, true)).toEqual([1]);
    expect(readableVoteIndexes(voting, 3, null, false)).toEqual([]);
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

  it('lists nothing during the introduction', () => {
    expect(summaryIndexes({ phase: 'intro', currentCategoryIndex: 0, categories })).toEqual([]);
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
    expect(shouldAutoReveal({ ...base, voteCount: 0, totalVoters: 0 })).toBe(false);
  });

  it('does not fire outside the voting phase', () => {
    expect(shouldAutoReveal({ ...base, phase: 'revealed' })).toBe(false);
  });

  it('fires when every eligible voter voted and the facilitator does not vote', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'voting', currentCategoryIndex: 0, facilitatorVotes: false },
        voters: { '0': { bob: true } },
      }),
      'fac',
    )!;
    expect(shouldAutoReveal(s)).toBe(true);
  });
});

describe('canStartWorkshop', () => {
  it('lets the facilitator start from the lobby with at least one voter', () => {
    expect(canStartWorkshop(deriveClientState('ABC234', raw(), 'fac')!)).toBe(true);
  });

  it('refuses when the facilitator is alone and does not vote', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'lobby', currentCategoryIndex: 0, facilitatorVotes: false },
        participants: { fac: { name: 'Alice' } },
      }),
      'fac',
    )!;
    expect(s.totalVoters).toBe(0);
    expect(canStartWorkshop(s)).toBe(false);
  });

  it('refuses for participants and outside the lobby', () => {
    expect(canStartWorkshop(deriveClientState('ABC234', raw(), 'bob')!)).toBe(false);
    const intro = deriveClientState(
      'ABC234',
      raw({ state: { phase: 'intro', currentCategoryIndex: 0 } }),
      'fac',
    )!;
    expect(canStartWorkshop(intro)).toBe(false);
  });
});

describe('readableBallotIndexes', () => {
  const revealed = (anonymity?: 'off' | 'facilitator' | 'full') => ({
    phase: 'revealed' as const,
    currentCategoryIndex: 2,
    anonymity,
  });

  it("reads nothing in 'full' sessions or when the setting is absent", () => {
    expect(readableBallotIndexes(revealed('full'), 3, { '0': true }, true)).toEqual([]);
    expect(readableBallotIndexes(revealed(), 3, { '0': true }, true)).toEqual([]);
  });

  it('reads nothing while a round is being voted', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 1, anonymity: 'off' as const };
    expect(readableBallotIndexes(voting, 3, null, true)).toEqual([]);
    expect(readableBallotIndexes(voting, 3, null, false)).toEqual([]);
  });

  it("lets everyone read the revealed round in 'off' sessions, plus closed rounds for the facilitator", () => {
    expect(readableBallotIndexes(revealed('off'), 3, { '0': true }, false)).toEqual([2]);
    expect(readableBallotIndexes(revealed('off'), 3, { '0': true }, true)).toEqual([0, 2]);
  });

  it("lets only the facilitator read in 'facilitator' sessions", () => {
    expect(readableBallotIndexes(revealed('facilitator'), 3, { '0': true }, true)).toEqual([0, 2]);
    expect(readableBallotIndexes(revealed('facilitator'), 3, { '0': true }, false)).toEqual([]);
  });

  it('reads every category when finished', () => {
    const finished = { phase: 'finished' as const, currentCategoryIndex: 0, anonymity: 'off' as const };
    expect(readableBallotIndexes(finished, 3)).toEqual([0, 1, 2]);
  });
});

describe('sharedNamedVotes', () => {
  const named = { 0: [{ id: 'bob', name: 'Bob', vote: { color: 'green' as const, trend: 'up' as const } }] };

  it("shows names on shared screens only in 'off' sessions", () => {
    expect(sharedNamedVotes({ anonymity: 'off', namedVotes: named }, 0)).toEqual(named[0]);
    expect(sharedNamedVotes({ anonymity: 'facilitator', namedVotes: named }, 0)).toBeUndefined();
    expect(sharedNamedVotes({ anonymity: 'full', namedVotes: named }, 0)).toBeUndefined();
  });

  it('is undefined for a category without loaded ballots', () => {
    expect(sharedNamedVotes({ anonymity: 'off', namedVotes: named }, 1)).toBeUndefined();
  });
});


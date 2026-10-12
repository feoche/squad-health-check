import { describe, expect, it } from 'vitest';
import { NamedVote, Vote, VoteColor, VoteDelay, VoteTrend } from '../types';
import {
  FUN_STAT_IDS,
  FunStatsInput,
  computeFunStats,
  formatSeconds,
  pickFunStats,
} from './funStats';
import { messagesFor } from './i18n';

const v = (color: VoteColor, trend: VoteTrend = 'stable'): Vote => ({ color, trend });
const nv = (id: string, vote: Vote): NamedVote => ({ id, name: id.toUpperCase(), vote });
const delay = (id: string, ms: number): VoteDelay => ({ id, name: id.toUpperCase(), ms });

/** Three people, three categories: ann always green, bob always red, cat in between */
function input(overrides: Partial<FunStatsInput> = {}): FunStatsInput {
  const rounds: [string, Vote][][] = [
    [['ann', v('green', 'up')], ['bob', v('red', 'down')], ['cat', v('orange')]],
    [['ann', v('green', 'up')], ['bob', v('red', 'down')], ['cat', v('green')]],
    [['ann', v('green')], ['bob', v('red', 'down')], ['cat', v('orange')]],
  ];
  return {
    titles: ['Speed', 'Fun', 'Teamwork'],
    votes: rounds.map((r) => r.map(([, vote]) => vote)),
    named: rounds.map((r) => r.map(([id, vote]) => nv(id, vote))),
    delays: [
      [delay('ann', 800), delay('bob', 4000), delay('cat', 9000)],
      [delay('ann', 1500), delay('bob', 3000), delay('cat', 7000)],
      [delay('ann', 900), delay('bob', 5000), delay('cat', 6000)],
    ],
    ...overrides,
  };
}

const find = (stats: ReturnType<typeof computeFunStats>, id: string) => stats.find((s) => s.id === id);

describe('computeFunStats', () => {
  const stats = computeFunStats(input());

  it('names the pessimist and the optimist from the named votes', () => {
    expect(find(stats, 'pessimisticPal')?.params.name).toBe('BOB');
    expect(find(stats, 'optimisticOtter')?.params.name).toBe('ANN');
  });

  it('names the quickest and the slowest voter, and the fastest single vote', () => {
    expect(find(stats, 'quickestDraw')?.params).toMatchObject({ name: 'ANN' });
    expect(find(stats, 'deepThinker')?.params.name).toBe('CAT');
    expect(find(stats, 'lightning')?.params).toMatchObject({ name: 'ANN', category: 'Speed', value: '0.8 s' });
  });

  it('finds the first and the last voter of most rounds', () => {
    expect(find(stats, 'firstResponder')?.params).toMatchObject({ name: 'ANN', value: '3' });
    expect(find(stats, 'fashionablyLate')?.params).toMatchObject({ name: 'CAT', value: '3' });
  });

  it('finds the healthiest and the lowest category', () => {
    const quiet = computeFunStats(
      input({
        votes: [[v('green', 'up'), v('green', 'up'), v('green')], [v('red', 'down'), v('red'), v('orange')], [v('orange'), v('orange'), v('green')]],
        named: [undefined, undefined, undefined],
        delays: [undefined, undefined, undefined],
      }),
    );
    expect(find(quiet, 'sunnySide')?.params.category).toBe('Speed');
    expect(find(quiet, 'stormCloud')?.params.category).toBe('Fun');
  });

  it('shows no name when the votes are anonymous', () => {
    const anonymous = computeFunStats(input({ named: [undefined, undefined, undefined] }));
    expect(anonymous.filter((s) => s.group === 'person')).toEqual([]);
    expect(anonymous.some((s) => s.group === 'team')).toBe(true);
  });

  it('shows no speed stat when the round starts were not recorded', () => {
    const untimed = computeFunStats(input({ delays: [undefined, undefined, undefined] }));
    expect(untimed.filter((s) => s.group === 'speed')).toEqual([]);
  });

  it('skips a stat two people share', () => {
    const tied = computeFunStats(
      input({
        delays: [
          [delay('ann', 1000), delay('bob', 1000), delay('cat', 9000)],
          [delay('ann', 1000), delay('bob', 1000), delay('cat', 9000)],
          [delay('ann', 1000), delay('bob', 1000), delay('cat', 9000)],
        ],
      }),
    );
    expect(find(tied, 'quickestDraw')).toBeUndefined();
    expect(find(tied, 'deepThinker')?.params.name).toBe('CAT');
  });

  it('says nothing about people when fewer than three took part', () => {
    const duo = input();
    duo.named = duo.named.map((n) => n?.slice(0, 2));
    expect(computeFunStats(duo).filter((s) => s.group === 'person')).toEqual([]);
  });

  it('leaves out people who voted in fewer than half the rounds', () => {
    const base = input();
    const four = [...base.named, base.named[0]];
    // Dan joined for one round only, with the greenest score
    const withDan = four.map((n, i) => (i === 0 ? [...n!, nv('dan', v('green', 'up'))] : n));
    const stats = computeFunStats({ ...base, titles: [...base.titles, 'X'], votes: [...base.votes, base.votes[0]], named: withDan, delays: [...base.delays, base.delays[0]] });
    expect(find(stats, 'optimisticOtter')?.params.name).toBe('ANN');
  });

  it('has nothing to say about a session without votes', () => {
    expect(computeFunStats({ titles: ['A'], votes: [[]], named: [undefined], delays: [undefined] })).toEqual([]);
  });
});

describe('pickFunStats', () => {
  const stats = computeFunStats(input());

  it('picks the same stats for the same seed, and at most the number asked', () => {
    const a = pickFunStats(stats, 'INDIGO');
    expect(a).toEqual(pickFunStats(stats, 'INDIGO'));
    expect(a).toHaveLength(4);
    expect(new Set(a.map((s) => s.id)).size).toBe(4);
  });

  it('varies with the seed', () => {
    const picks = new Set(['A', 'B', 'C', 'D', 'E', 'F'].map((seed) => pickFunStats(stats, seed).map((s) => s.id).join()));
    expect(picks.size).toBeGreaterThan(1);
  });

  it('mixes the groups when it can', () => {
    expect(new Set(pickFunStats(stats, 'INDIGO').map((s) => s.group)).size).toBe(3);
  });

  it('returns what there is when less than asked', () => {
    expect(pickFunStats(stats.slice(0, 2), 'X')).toHaveLength(2);
    expect(pickFunStats([], 'X')).toEqual([]);
  });
});

describe('texts', () => {
  it('has a title and a text in both languages for every stat', () => {
    for (const lang of ['en', 'fr'] as const) {
      const m = messagesFor(lang);
      for (const id of FUN_STAT_IDS) {
        expect(m.funStats[id].title, `${lang} ${id}`).toBeTruthy();
        expect(m.funStats[id].text({ name: 'X', category: 'C', value: '1', color: 'Red' }), `${lang} ${id}`).not.toContain('undefined');
      }
    }
  });

  it('only produces stats that have a text', () => {
    for (const s of computeFunStats(input())) expect(FUN_STAT_IDS).toContain(s.id);
  });
});

describe('formatSeconds', () => {
  it('keeps a decimal under ten seconds, then whole seconds, then minutes', () => {
    expect(formatSeconds(800)).toBe('0.8 s');
    expect(formatSeconds(12_400)).toBe('12 s');
    expect(formatSeconds(75_000)).toBe('1:15');
  });
});

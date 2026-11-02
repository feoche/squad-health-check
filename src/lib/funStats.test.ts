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
    voteMode: 'colors',
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
    expect(computeFunStats({ voteMode: 'colors', titles: ['A'], votes: [[]], named: [undefined], delays: [undefined] })).toEqual([]);
  });
});

const r = (score: number, trend: VoteTrend = 'stable'): Vote => ({ score, trend });

/** Three people, three categories: ann always 9, bob always 1, cat in between */
function rangeInput(overrides: Partial<FunStatsInput> = {}): FunStatsInput {
  const rounds: [string, Vote][][] = [
    [['ann', r(9, 'up')], ['bob', r(1, 'down')], ['cat', r(5)]],
    [['ann', r(9, 'up')], ['bob', r(1, 'down')], ['cat', r(7)]],
    [['ann', r(9)], ['bob', r(1, 'down')], ['cat', r(5)]],
  ];
  return {
    voteMode: 'range',
    titles: ['Speed', 'Fun', 'Teamwork'],
    votes: rounds.map((x) => x.map(([, vote]) => vote)),
    named: rounds.map((x) => x.map(([id, vote]) => nv(id, vote))),
    delays: [undefined, undefined, undefined],
    ...overrides,
  };
}

describe('computeFunStats in range sessions', () => {
  const stats = computeFunStats(rangeInput());
  const ids = stats.map((s) => s.id);

  it('never produces a color-based stat', () => {
    for (const id of ['greenParty', 'redAlert', 'teamMood', 'flawless', 'splitRoom', 'redFree', 'pessimisticPal',
      'optimisticOtter', 'blackOrWhite', 'fenceSitter', 'stormChaser', 'greenThumb', 'creatureOfHabit']) {
      expect(ids, id).not.toContain(id);
    }
  });

  it('keeps the stats that only need medians, spread and trends', () => {
    expect(find(stats, 'sunnySide')?.params.category).toBe('Fun');
    expect(find(stats, 'lookingUp')).toBeDefined();
  });

  it('averages the scores of the whole check', () => {
    expect(find(stats, 'teamAverage')?.params.value).toBe('5.2/9');
  });

  it('finds who scored highest and lowest on average', () => {
    expect(find(stats, 'sunnyAverage')?.params).toMatchObject({ name: 'ANN', value: '9.0/9' });
    expect(find(stats, 'gloomyAverage')?.params).toMatchObject({ name: 'BOB', value: '1.0/9' });
  });

  it('counts the 9s per person, and skips a tie on the extremes', () => {
    expect(find(stats, 'nineLives')?.params).toMatchObject({ name: 'ANN', value: '3' });
    // ann has three 9s and bob three 1s: nobody has the most extremes
    expect(find(stats, 'allOrNothing')).toBeUndefined();
  });

  it('finds the category whose scores stretch the most', () => {
    // every round of the base input spans 1 → 9: tie, so nothing is said
    expect(find(stats, 'rubberBand')).toBeUndefined();
    const stretched = computeFunStats(
      rangeInput({ votes: [[r(1), r(9), r(5)], [r(4), r(5), r(6)], [r(5), r(6), r(5)]], named: [undefined, undefined, undefined] }),
    );
    expect(find(stretched, 'rubberBand')?.params).toMatchObject({ category: 'Speed', value: '1 → 9' });
  });

  it('names someone who gave the same score nearly every time', () => {
    const habit = computeFunStats(
      rangeInput({
        votes: [[r(6), r(6), r(2)], [r(6), r(3), r(9)], [r(6), r(4), r(8)], [r(6), r(2), r(7)]],
        titles: ['A', 'B', 'C', 'D'],
        named: [0, 1, 2, 3].map((i) => [nv('ann', r(6)), nv('bob', r([2, 3, 4, 2][i])), nv('cat', r([2, 9, 8, 7][i]))]),
        delays: [undefined, undefined, undefined, undefined],
      }),
    );
    expect(find(habit, 'oneTrickPony')?.params).toMatchObject({ name: 'ANN', score: '6', value: '4/4' });
  });

  it('finds a unanimous category and a high floor', () => {
    const calm = computeFunStats(
      rangeInput({ votes: [[r(7), r(7), r(7)], [r(8), r(9), r(7)], [r(6), r(5), r(9)]], named: [undefined, undefined, undefined] }),
    );
    expect(find(calm, 'bullseye')?.params).toMatchObject({ category: 'Speed', value: '7' });
    expect(find(calm, 'highFloor')?.params.value).toBe('5');
    expect(find(calm, 'rockBottom')).toBeUndefined();
  });

  it('skips a stat with no winner or below its threshold', () => {
    // one 1 per round is not enough to name a category
    expect(find(stats, 'rockBottom')).toBeUndefined();
    expect(find(stats, 'topMarks')).toBeUndefined();
    const flat = computeFunStats(
      rangeInput({ votes: [[r(5), r(5), r(6)], [r(5), r(6), r(6)], [r(5), r(5), r(6)]], named: [undefined, undefined, undefined] }),
    );
    expect(find(flat, 'topMarks')).toBeUndefined();
    expect(find(flat, 'rubberBand')).toBeUndefined();
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
        expect(m.funStats[id].text({ name: 'X', category: 'C', value: '1', color: 'Red', score: '5' }), `${lang} ${id}`).not.toContain('undefined');
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

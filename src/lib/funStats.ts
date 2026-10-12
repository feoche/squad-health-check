import { ClientSessionState, NamedVote, Vote, VoteColor, VoteDelay } from '../types';
import { sharedNamedVotes } from './deriveClientState';
import { t } from './i18n';
import { localizeCategory } from './localizeCategory';
import { medianScore, voteWeight } from './voteScore';

/* ─── Fun stats shown once the session is finished: who was the quickest, the most pessimistic, which category split the room… ─── */

/** Team stats need no names; person stats need named votes; speed stats need the vote times */
export type FunStatGroup = 'team' | 'person' | 'speed';

/** Values the stat's text is built from (see `funStats` in i18n) */
export interface FunStatParams {
  name?: string;
  category?: string;
  value?: string;
  color?: string;
}

export const FUN_STAT_IDS = [
  // team
  'sunnySide', 'stormCloud', 'hotDebate', 'choir', 'greenParty', 'redAlert', 'teamMood', 'lookingUp',
  'slidingDown', 'risingStar', 'flawless', 'splitRoom', 'redFree', 'steady', 'voiceCount',
  // person
  'pessimisticPal', 'optimisticOtter', 'devilsAdvocate', 'teamMirror', 'blackOrWhite', 'fenceSitter',
  'stormChaser', 'greenThumb', 'worrier', 'believer', 'creatureOfHabit',
  // speed
  'quickestDraw', 'deepThinker', 'lightning', 'firstResponder', 'fashionablyLate', 'inSync', 'slowBurner',
] as const;
export type FunStatId = (typeof FUN_STAT_IDS)[number];

export interface FunStat {
  id: FunStatId;
  group: FunStatGroup;
  emoji: string;
  params: FunStatParams;
}

export interface FunStatsInput {
  /** Category titles in the user's language, by index */
  titles: string[];
  /** Every vote of each category, offline ones included */
  votes: Vote[][];
  /** Votes with their voter, by category; undefined where names must not be shown */
  named: (NamedVote[] | undefined)[];
  /** How long each participant took to vote, by category; undefined when the round's start was not recorded */
  delays: (VoteDelay[] | undefined)[];
}

export function funStatsInput(session: ClientSessionState): FunStatsInput {
  const indexes = session.categories.map((_, i) => i);
  return {
    titles: session.categories.map((c) => localizeCategory(c).title),
    votes: indexes.map((i) => session.allResults.find((r) => r.categoryIndex === i)?.votes ?? []),
    named: indexes.map((i) => sharedNamedVotes(session, i)),
    delays: indexes.map((i) => session.voteDelays[i]),
  };
}

/* ─── Helpers ─── */

const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;
const count = (n: number) => String(n);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;
const stdDev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Seconds with a decimal while short, whole seconds past ten, m:ss past a minute */
export function formatSeconds(ms: number): string {
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)} s`;
  if (s < 60) return `${Math.round(s)} s`;
  const total = Math.round(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** The single best item by score, or null when two share it */
function unique<T>(items: T[], score: (item: T) => number, direction: 'max' | 'min' = 'max'): T | null {
  if (!items.length) return null;
  const sign = direction === 'max' ? 1 : -1;
  const sorted = [...items].sort((a, b) => sign * (score(b) - score(a)));
  if (sorted.length > 1 && score(sorted[0]) === score(sorted[1])) return null;
  return sorted[0];
}

interface Cat {
  title: string;
  votes: Vote[];
  weights: number[];
  median: number;
  spread: number;
}

interface Person {
  name: string;
  weights: number[];
  colors: Record<VoteColor, number>;
  trends: Record<'up' | 'stable' | 'down', number>;
  /** Average gap between their score and the round's median */
  gap: number;
}

interface Speedy {
  name: string;
  delays: number[];
  firsts: number;
  lasts: number;
}

/** A person needs to have voted in at least half the rounds for their averages and counts to compare with the others' */
const minRounds = (played: number) => Math.max(2, Math.ceil(played / 2));

/** Fewest people for whom "the most" or "the least" still means something */
const MIN_PEOPLE = 3;

function categoriesOf(input: FunStatsInput): Cat[] {
  return input.votes.flatMap((votes, i) => {
    const median = medianScore(votes);
    if (median === null) return [];
    const weights = votes.map(voteWeight);
    return [{ title: input.titles[i], votes, weights, median, spread: stdDev(weights) }];
  });
}

function peopleOf(input: FunStatsInput): Person[] {
  const byId = new Map<string, { name: string; votes: Vote[]; gaps: number[] }>();
  input.named.forEach((named, i) => {
    const median = medianScore(input.votes[i]);
    if (!named || median === null) return;
    for (const { id, name, vote } of named) {
      if (name === null) continue;
      const entry = byId.get(id) ?? { name, votes: [], gaps: [] };
      entry.votes.push(vote);
      entry.gaps.push(Math.abs(voteWeight(vote) - median));
      byId.set(id, entry);
    }
  });
  const played = input.named.filter((n) => n?.length).length;
  const people = [...byId.values()]
    .filter((p) => p.votes.length >= minRounds(played))
    .map((p) => ({
      name: p.name,
      weights: p.votes.map(voteWeight),
      colors: { green: 0, orange: 0, red: 0 } as Person['colors'],
      trends: { up: 0, stable: 0, down: 0 },
      gap: mean(p.gaps),
      votes: p.votes,
    }));
  for (const p of people) {
    for (const v of p.votes) {
      p.colors[v.color]++;
      p.trends[v.trend]++;
    }
  }
  return people.length >= MIN_PEOPLE ? people : [];
}

function speedOf(input: FunStatsInput): { people: Speedy[]; rounds: { title: string; spread: number; size: number }[] } {
  const byId = new Map<string, Speedy>();
  const rounds: { title: string; spread: number; size: number }[] = [];
  input.delays.forEach((delays, i) => {
    if (!delays?.length) return;
    const ms = delays.map((d) => d.ms);
    rounds.push({ title: input.titles[i], spread: Math.max(...ms) - Math.min(...ms), size: delays.length });
    const first = unique(delays, (d) => d.ms, 'min');
    const last = unique(delays, (d) => d.ms, 'max');
    for (const d of delays) {
      const entry = byId.get(d.id) ?? { name: d.name, delays: [], firsts: 0, lasts: 0 };
      entry.delays.push(d.ms);
      if (first && first.id === d.id) entry.firsts++;
      if (last && last.id === d.id) entry.lasts++;
      byId.set(d.id, entry);
    }
  });
  const people = [...byId.values()].filter((p) => p.delays.length >= minRounds(rounds.length));
  return { people: people.length >= MIN_PEOPLE ? people : [], rounds };
}

/* ─── The stats: each returns what its text needs, or null when it does not apply to this session ─── */

interface Ctx {
  input: FunStatsInput;
  cats: Cat[];
  people: Person[];
  speed: Speedy[];
  rounds: { title: string; spread: number; size: number }[];
  allVotes: Vote[];
}

interface Definition {
  id: FunStatId;
  group: FunStatGroup;
  emoji: string;
  compute: (c: Ctx) => FunStatParams | null;
}

const share = (votes: Vote[], pick: (v: Vote) => boolean) => votes.filter(pick).length;
/** Categories need a few votes before a share of them says anything */
const MIN_VOTES = 3;
const sized = (cats: Cat[]) => cats.filter((c) => c.votes.length >= MIN_VOTES);

const DEFINITIONS: Definition[] = [
  /* Team */
  { id: 'sunnySide', group: 'team', emoji: '☀️', compute: ({ cats }) => {
    const best = unique(cats, (c) => c.median);
    return cats.length > 1 && best ? { category: best.title } : null;
  } },
  { id: 'stormCloud', group: 'team', emoji: '⛈️', compute: ({ cats }) => {
    const worst = unique(cats, (c) => c.median, 'min');
    return cats.length > 1 && worst ? { category: worst.title } : null;
  } },
  { id: 'hotDebate', group: 'team', emoji: '🔥', compute: ({ cats }) => {
    const top = unique(sized(cats), (c) => c.spread);
    return top && top.spread > 0 ? { category: top.title } : null;
  } },
  { id: 'choir', group: 'team', emoji: '🎶', compute: ({ cats }) => {
    const top = unique(sized(cats), (c) => c.spread, 'min');
    return top && top.spread < 1 ? { category: top.title } : null;
  } },
  { id: 'greenParty', group: 'team', emoji: '🥳', compute: ({ cats }) => {
    const top = unique(sized(cats), (c) => share(c.votes, (v) => v.color === 'green') / c.votes.length);
    const greens = top && share(top.votes, (v) => v.color === 'green');
    return top && greens && greens / top.votes.length >= 0.5
      ? { category: top.title, value: pct(greens, top.votes.length) }
      : null;
  } },
  { id: 'redAlert', group: 'team', emoji: '🚨', compute: ({ cats }) => {
    const top = unique(sized(cats), (c) => share(c.votes, (v) => v.color === 'red') / c.votes.length);
    const reds = top && share(top.votes, (v) => v.color === 'red');
    return top && reds ? { category: top.title, value: pct(reds, top.votes.length) } : null;
  } },
  { id: 'teamMood', group: 'team', emoji: '🌤️', compute: ({ allVotes }) => {
    if (allVotes.length < MIN_VOTES) return null;
    return { value: pct(share(allVotes, (v) => v.color === 'green'), allVotes.length) };
  } },
  { id: 'lookingUp', group: 'team', emoji: '📈', compute: ({ allVotes }) => {
    if (allVotes.length < MIN_VOTES) return null;
    const ups = share(allVotes, (v) => v.trend === 'up');
    return ups ? { value: pct(ups, allVotes.length) } : null;
  } },
  { id: 'slidingDown', group: 'team', emoji: '📉', compute: ({ cats }) => {
    const top = unique(cats, (c) => share(c.votes, (v) => v.trend === 'down'));
    const downs = top && share(top.votes, (v) => v.trend === 'down');
    return top && downs && downs >= 2 ? { category: top.title, value: count(downs) } : null;
  } },
  { id: 'risingStar', group: 'team', emoji: '🚀', compute: ({ cats }) => {
    const top = unique(cats, (c) => share(c.votes, (v) => v.trend === 'up'));
    const ups = top && share(top.votes, (v) => v.trend === 'up');
    return top && ups && ups >= 2 ? { category: top.title, value: count(ups) } : null;
  } },
  { id: 'flawless', group: 'team', emoji: '💎', compute: ({ cats }) => {
    const top = sized(cats).find((c) => c.votes.every((v) => v.color === 'green'));
    return top ? { category: top.title } : null;
  } },
  { id: 'splitRoom', group: 'team', emoji: '⚖️', compute: ({ cats }) => {
    const split = cats.filter((c) => c.votes.some((v) => v.color === 'green') && c.votes.some((v) => v.color === 'red'));
    return split.length ? { value: count(split.length) } : null;
  } },
  { id: 'redFree', group: 'team', emoji: '🍀', compute: ({ allVotes, cats }) =>
    cats.length > 1 && allVotes.length >= MIN_VOTES && !allVotes.some((v) => v.color === 'red') ? {} : null },
  { id: 'steady', group: 'team', emoji: '🧘', compute: ({ allVotes }) => {
    if (allVotes.length < MIN_VOTES) return null;
    const stable = share(allVotes, (v) => v.trend === 'stable');
    return stable / allVotes.length >= 0.5 ? { value: pct(stable, allVotes.length) } : null;
  } },
  { id: 'voiceCount', group: 'team', emoji: '🗳️', compute: ({ allVotes, cats }) =>
    allVotes.length ? { value: count(allVotes.length), category: count(cats.length) } : null },

  /* Person */
  { id: 'pessimisticPal', group: 'person', emoji: '🌧️', compute: ({ people }) => {
    const p = unique(people, (x) => mean(x.weights), 'min');
    return p ? { name: p.name, value: `${p.colors.orange + p.colors.red}/${p.weights.length}` } : null;
  } },
  { id: 'optimisticOtter', group: 'person', emoji: '🦦', compute: ({ people }) => {
    const p = unique(people, (x) => mean(x.weights));
    return p ? { name: p.name, value: `${p.colors.green}/${p.weights.length}` } : null;
  } },
  { id: 'devilsAdvocate', group: 'person', emoji: '😈', compute: ({ people }) => {
    const p = unique(people, (x) => x.gap);
    return p && p.gap > 0 ? { name: p.name } : null;
  } },
  { id: 'teamMirror', group: 'person', emoji: '🪞', compute: ({ people }) => {
    const p = unique(people, (x) => x.gap, 'min');
    return p ? { name: p.name } : null;
  } },
  { id: 'blackOrWhite', group: 'person', emoji: '🏁', compute: ({ people }) => {
    const p = unique(people, (x) => (x.colors.green + x.colors.red) / x.weights.length);
    return p && p.colors.orange < p.weights.length / 2
      ? { name: p.name, value: pct(p.colors.green + p.colors.red, p.weights.length) }
      : null;
  } },
  { id: 'fenceSitter', group: 'person', emoji: '🪑', compute: ({ people }) => {
    const p = unique(people, (x) => x.colors.orange);
    return p && p.colors.orange >= 2 ? { name: p.name, value: `${p.colors.orange}/${p.weights.length}` } : null;
  } },
  { id: 'stormChaser', group: 'person', emoji: '🌪️', compute: ({ people }) => {
    const p = unique(people, (x) => x.colors.red);
    return p && p.colors.red >= 2 ? { name: p.name, value: count(p.colors.red) } : null;
  } },
  { id: 'greenThumb', group: 'person', emoji: '🌱', compute: ({ people }) => {
    const p = unique(people, (x) => x.colors.green);
    return p && p.colors.green >= 2 ? { name: p.name, value: count(p.colors.green) } : null;
  } },
  { id: 'worrier', group: 'person', emoji: '🔮', compute: ({ people }) => {
    const p = unique(people, (x) => x.trends.down);
    return p && p.trends.down >= 2 ? { name: p.name, value: count(p.trends.down) } : null;
  } },
  { id: 'believer', group: 'person', emoji: '🙌', compute: ({ people }) => {
    const p = unique(people, (x) => x.trends.up);
    return p && p.trends.up >= 2 ? { name: p.name, value: count(p.trends.up) } : null;
  } },
  { id: 'creatureOfHabit', group: 'person', emoji: '🐢', compute: ({ people }) => {
    const habit = (p: Person) => Math.max(p.colors.green, p.colors.orange, p.colors.red);
    const p = unique(people.filter((x) => x.weights.length >= 4), (x) => habit(x) / x.weights.length);
    if (!p || habit(p) / p.weights.length < 0.75) return null;
    const color = (['green', 'orange', 'red'] as VoteColor[]).find((c) => p.colors[c] === habit(p))!;
    return { name: p.name, color: t.colors[color], value: `${habit(p)}/${p.weights.length}` };
  } },

  /* Speed */
  { id: 'quickestDraw', group: 'speed', emoji: '🤠', compute: ({ speed }) => {
    const p = unique(speed, (x) => mean(x.delays), 'min');
    return p ? { name: p.name, value: formatSeconds(mean(p.delays)) } : null;
  } },
  { id: 'deepThinker', group: 'speed', emoji: '🤔', compute: ({ speed }) => {
    const p = unique(speed, (x) => mean(x.delays));
    return p ? { name: p.name, value: formatSeconds(mean(p.delays)) } : null;
  } },
  { id: 'lightning', group: 'speed', emoji: '⚡', compute: ({ input }) => {
    const all = input.delays.flatMap((delays, i) => (delays ?? []).map((d) => ({ ...d, category: input.titles[i] })));
    if (all.length < MIN_PEOPLE) return null;
    const best = unique(all, (d) => d.ms, 'min');
    return best ? { name: best.name, category: best.category, value: formatSeconds(best.ms) } : null;
  } },
  { id: 'firstResponder', group: 'speed', emoji: '🚒', compute: ({ speed }) => {
    const p = unique(speed, (x) => x.firsts);
    return p && p.firsts >= 2 ? { name: p.name, value: count(p.firsts) } : null;
  } },
  { id: 'fashionablyLate', group: 'speed', emoji: '🎩', compute: ({ speed }) => {
    const p = unique(speed, (x) => x.lasts);
    return p && p.lasts >= 2 ? { name: p.name, value: count(p.lasts) } : null;
  } },
  { id: 'inSync', group: 'speed', emoji: '🤝', compute: ({ rounds }) => {
    const r = unique(rounds.filter((x) => x.size >= MIN_VOTES), (x) => x.spread, 'min');
    return r ? { category: r.title, value: formatSeconds(r.spread) } : null;
  } },
  { id: 'slowBurner', group: 'speed', emoji: '🕰️', compute: ({ rounds }) => {
    const r = unique(rounds.filter((x) => x.size >= MIN_VOTES), (x) => x.spread);
    return r ? { category: r.title, value: formatSeconds(r.spread) } : null;
  } },
];

/** Every stat that applies to this session */
export function computeFunStats(input: FunStatsInput): FunStat[] {
  const speed = speedOf(input);
  const ctx: Ctx = {
    input,
    cats: categoriesOf(input),
    people: peopleOf(input),
    speed: speed.people,
    rounds: speed.rounds,
    allVotes: input.votes.flat(),
  };
  return DEFINITIONS.flatMap((d) => {
    const params = d.compute(ctx);
    return params ? [{ id: d.id, group: d.group, emoji: d.emoji, params }] : [];
  });
}

/* ─── Picking: a few stats, mixing the groups, the same ones every time the same session is shown ─── */

function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const FUN_STATS_SHOWN = 4;

/** Takes the stats group by group in turn, so a banner mixes who-did-what, how-fast and how-the-team-feels */
export function pickFunStats(stats: FunStat[], seed: string, shown = FUN_STATS_SHOWN): FunStat[] {
  const random = seededRandom(seed);
  const groups = shuffled(['team', 'person', 'speed'] as FunStatGroup[], random);
  const queues = groups.map((g) => shuffled(stats.filter((s) => s.group === g), random)).filter((q) => q.length);
  const picked: FunStat[] = [];
  while (picked.length < shown && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && picked.length < shown) picked.push(next);
    }
  }
  return picked;
}

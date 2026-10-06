import { afterEach, describe, expect, it, vi } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import schema from '../../public/session-export.schema.json';
import { CategoryResult } from '../types';
import {
  clearPreviousSession,
  evolution,
  exportDate,
  findPrevious,
  loadLastSession,
  loadPreviousSession,
  parseSessionExport,
  saveLastSession,
  savePreviousSession,
  toSessionExport,
} from './sessionHistory';

const categories = [
  { name: 'Fun', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
  { name: 'Ownership', nameFr: 'Responsabilité', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
];

const allResults: CategoryResult[] = [
  {
    categoryIndex: 0,
    votes: [
      { color: 'orange', trend: 'stable' },
      { color: 'orange', trend: 'up' },
    ],
    notes: 'we laughed a lot',
  },
  { categoryIndex: 1, votes: [], notes: '' },
];

const exported = toSessionExport({ categories, allResults, totalVoters: 8 }, new Date(2026, 9, 6), 'fr');

describe('toSessionExport', () => {
  it('keeps what the recap shows, with the stable name and the median score', () => {
    expect(exported).toEqual({
      version: 1,
      date: '2026-10-06',
      voters: 8,
      categories: [
        { name: 'Fun', title: 'Fun', votes: 2, median: 5.5, notes: 'we laughed a lot' },
        { name: 'Ownership', title: 'Responsabilité', votes: 0, median: null, notes: '' },
      ],
    });
  });
});

describe('parseSessionExport', () => {
  const withCategory = (patch: object) =>
    JSON.stringify({ ...exported, categories: [{ ...exported.categories[0], ...patch }] });

  it('reads its own export back', () => {
    expect(parseSessionExport(JSON.stringify(exported))).toEqual(exported);
  });

  it('drops unknown fields', () => {
    const text = JSON.stringify({ ...exported, extra: 1, categories: [{ ...exported.categories[0], extra: 2 }] });
    expect(parseSessionExport(text)).toEqual({ ...exported, categories: [exported.categories[0]] });
  });

  it('rejects what is not a session export', () => {
    expect(parseSessionExport('{not json')).toBeNull();
    expect(parseSessionExport('# Squad Health Check — 6 October 2026')).toBeNull();
    expect(parseSessionExport('[]')).toBeNull();
    expect(parseSessionExport(JSON.stringify({ ...exported, version: 2 }))).toBeNull();
    expect(parseSessionExport(JSON.stringify({ ...exported, date: '06/10/2026' }))).toBeNull();
    expect(parseSessionExport(JSON.stringify({ version: 1, date: '2026-10-06' }))).toBeNull();
  });

  it('needs the number of voters', () => {
    const { voters, ...withoutVoters } = exported;
    expect(parseSessionExport(JSON.stringify(withoutVoters))).toBeNull();
    expect(parseSessionExport(JSON.stringify({ ...exported, voters: -1 }))).toBeNull();
    expect(parseSessionExport(JSON.stringify({ ...exported, voters: 2.5 }))).toBeNull();
  });

  it('rejects the whole file when one category is malformed', () => {
    expect(parseSessionExport(withCategory({ median: 0 }))).toBeNull();
    expect(parseSessionExport(withCategory({ median: 10 }))).toBeNull();
    expect(parseSessionExport(withCategory({ median: '5' }))).toBeNull();
    expect(parseSessionExport(withCategory({ name: undefined }))).toBeNull();
    expect(parseSessionExport(withCategory({ votes: -1 }))).toBeNull();
    expect(parseSessionExport(withCategory({ votes: 1.5 }))).toBeNull();
    expect(parseSessionExport(withCategory({ notes: null }))).toBeNull();
  });
});

describe('session export schema', () => {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  const withCategory = (patch: object) => ({ ...exported, categories: [{ ...exported.categories[0], ...patch }] });

  it('accepts what the app exports', () => {
    expect(validate(exported), JSON.stringify(validate.errors)).toBe(true);
  });

  it('rejects what the app rejects on import', () => {
    const { voters, ...withoutVoters } = exported;
    const rejected = [
      withoutVoters,
      { ...exported, version: 2 },
      { ...exported, date: '06/10/2026' },
      { ...exported, voters: 2.5 },
      withCategory({ median: 0 }),
      withCategory({ median: 10 }),
      withCategory({ votes: -1 }),
      withCategory({ notes: null }),
    ];
    for (const file of rejected) {
      expect(parseSessionExport(JSON.stringify(file))).toBeNull();
      expect(validate(file)).toBe(false);
    }
  });
});

describe('exportDate', () => {
  it('reads the export day as a local date', () => {
    expect(exportDate('2026-10-06')).toEqual(new Date(2026, 9, 6));
  });
});

describe('evolution', () => {
  it('compares the medians', () => {
    expect(evolution(5, 6)).toBe('better');
    expect(evolution(5, 5.5)).toBe('better');
    expect(evolution(6, 6)).toBe('same');
    expect(evolution(6, 5.5)).toBe('worse');
  });

  it('has nothing to say when either session has no votes', () => {
    expect(evolution(null, 5)).toBeNull();
    expect(evolution(5, null)).toBeNull();
  });
});

describe('findPrevious', () => {
  it('matches on the stable name, whatever the language of the export', () => {
    expect(findPrevious(exported, categories[1])?.title).toBe('Responsabilité');
  });

  it('finds nothing for a new category or without an import', () => {
    expect(findPrevious(exported, { ...categories[0], name: 'Autonomy' })).toBeUndefined();
    expect(findPrevious(null, categories[0])).toBeUndefined();
  });
});

describe('previous session storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  function fakeStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
    return store;
  }

  it('keeps the import per session code until removed', () => {
    fakeStorage();
    savePreviousSession('ABC234', exported);
    expect(loadPreviousSession('ABC234')).toEqual(exported);
    expect(loadPreviousSession('XYZ789')).toBeNull();
    clearPreviousSession('ABC234');
    expect(loadPreviousSession('ABC234')).toBeNull();
  });

  it('ignores a corrupted stored value', () => {
    fakeStorage().set('previousSession:ABC234', '{oops');
    expect(loadPreviousSession('ABC234')).toBeNull();
  });

  it('survives blocked storage', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => savePreviousSession('ABC234', exported)).not.toThrow();
    expect(loadPreviousSession('ABC234')).toBeNull();
    expect(() => clearPreviousSession('ABC234')).not.toThrow();
  });

  it('remembers the last finished session, the latest one winning', () => {
    fakeStorage();
    expect(loadLastSession()).toBeNull();
    saveLastSession(exported);
    expect(loadLastSession()).toEqual(exported);
    const later = { ...exported, date: '2026-11-03' };
    saveLastSession(later);
    expect(loadLastSession()).toEqual(later);
  });

  it('ignores a corrupted last session', () => {
    fakeStorage().set('lastSessionResult', '{oops');
    expect(loadLastSession()).toBeNull();
  });

  it('survives blocked storage for the last session', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => saveLastSession(exported)).not.toThrow();
    expect(loadLastSession()).toBeNull();
  });
});

import { Category, ClientSessionState } from '../types';
import { LANG, Lang } from './i18n';
import { localizeCategory } from './localizeCategory';
import { MAX_SCORE, medianScore } from './voteScore';

/* ─── Session export: the recap as JSON, read back to compare the next session with it ─── */

export interface CategoryExport {
  /** Stable category key (Category.name), matched across sessions whatever the language */
  name: string;
  /** Title in the language of the export, for people reading the file */
  title: string;
  votes: number;
  /** Median score from 1 to 9, possibly a half; null without votes */
  median: number | null;
  notes: string;
}

export interface SessionExport {
  version: 1;
  /** Day of the export, YYYY-MM-DD */
  date: string;
  /** People who could vote: the participants, minus the facilitator when they did not vote */
  voters: number;
  categories: CategoryExport[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The day of an export as a local date, for display */
export function exportDate(day: string): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  return new Date(year, month - 1, dayOfMonth);
}

export function toSessionExport(
  session: Pick<ClientSessionState, 'categories' | 'allResults' | 'totalVoters'>,
  date = new Date(),
  lang: Lang = LANG,
): SessionExport {
  return {
    version: 1,
    date: isoDay(date),
    voters: session.totalVoters,
    categories: session.allResults.map((result) => {
      const category = session.categories[result.categoryIndex];
      return {
        name: category.name,
        title: localizeCategory(category, lang).title,
        votes: result.votes.length,
        median: medianScore(result.votes),
        notes: result.notes,
      };
    }),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A whole number of people or votes */
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

function isCategoryExport(value: unknown): value is CategoryExport {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.title === 'string' &&
    typeof value.notes === 'string' &&
    isCount(value.votes) &&
    (value.median === null ||
      (typeof value.median === 'number' && value.median >= 1 && value.median <= MAX_SCORE))
  );
}

/** A session export read back from a file, or null when it is not one */
export function parseSessionExport(text: string): SessionExport | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.version !== 1) return null;
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  if (!Array.isArray(value.categories)) return null;
  if (!isCount(value.voters)) return null;
  const categories: unknown[] = value.categories;
  if (!categories.every(isCategoryExport)) return null;
  return {
    version: 1,
    date: value.date,
    voters: value.voters,
    categories: categories.map(({ name, title, votes, median, notes }) => ({ name, title, votes, median, notes })),
  };
}

/* ─── Comparison ─── */

export type Evolution = 'better' | 'same' | 'worse';

/** How a category's median moved since the previous session; null when either has no votes */
export function evolution(previous: number | null, current: number | null): Evolution | null {
  if (previous === null || current === null) return null;
  return current > previous ? 'better' : current < previous ? 'worse' : 'same';
}

/** The previous session's entry for a category, matched on its stable name */
export const findPrevious = (previous: SessionExport | null, category: Category) =>
  previous?.categories.find((c) => c.name === category.name);

/* ─── Stored results (storage may be missing or blocked) ─── */

function load(key: string): SessionExport | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : parseSessionExport(raw);
  } catch {
    return null;
  }
}

function save(key: string, data: SessionExport) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* Storage blocked: kept until the page is reloaded */
  }
}

/** The session compared with, kept per session so a reload keeps it */
const previousKey = (code: string) => `previousSession:${code}`;

export const loadPreviousSession = (code: string) => load(previousKey(code));
export const savePreviousSession = (code: string, data: SessionExport) => save(previousKey(code), data);

export function clearPreviousSession(code: string) {
  try {
    localStorage.removeItem(previousKey(code));
  } catch {
    /* Storage blocked: nothing was stored */
  }
}

/** The result of the last session finished in this browser, offered as the previous one of the next */
const LAST_KEY = 'lastSessionResult';

export const loadLastSession = () => load(LAST_KEY);
export const saveLastSession = (data: SessionExport) => save(LAST_KEY, data);

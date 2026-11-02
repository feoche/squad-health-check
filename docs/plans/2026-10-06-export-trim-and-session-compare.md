# Trimmed Exports and Previous Session Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Markdown/PDF exports hold only what the facilitator recap shows, add a JSON export, and let the facilitator import a previous session's JSON to see, per category, the previous median and whether health got better, the same or worse.

**Architecture:** A new pure module `src/lib/sessionHistory.ts` owns the JSON format (build, parse/validate), the comparison (`evolution`, `findPrevious`) and the per-session `localStorage` copy of the import. `exportReport.ts` is trimmed and gains `downloadJSON`. `FacilitatorView` holds the imported session in state and hands it to `ReportExports` (import/remove UI) and `FinishedNotes` (one `PreviousResult` line per category). Nothing touches Firebase.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest (node environment, `src/**/*.test.ts` only — no component tests), `@ovhcloud/ods-react` 19.7, jsPDF + jspdf-autotable.

**Spec:** `docs/specs/2026-10-06-export-trim-and-session-compare-design.md`

## Global Constraints

- The comparison lives on the facilitator recap only; never on the shared recap or presenter screen; never written to Firebase; `database.rules.json` does not change.
- JSON file: `{ "version": 1, "date": "YYYY-MM-DD", "categories": [{ "name", "title", "votes", "median", "notes" }] }`, file name `squad-health-check-{code}.json`.
- Categories match across sessions on `Category.name`, whatever the language.
- The `x/9` score is never displayed in exports or UI; `median` in the JSON is the raw 1–9 score (possibly a half), `null` without votes.
- Import is kept in `localStorage` under `previousSession:{code}`; every storage access is wrapped in try/catch.
- Every user-facing string goes through `src/lib/i18n.ts`, in both `en` and `fr`.
- Commits: conventional style (`feat:`, `test:`…), no `Co-Authored-By` line, no Claude/tool references, don't commit `.claude/` files. Don't push.
- Run the full suite with `npx vitest run` and the type check/build with `npm run build` before each commit that touches `.tsx`.

## Review Focus

1. **The facilitator re-picks the same file** after removing it, or after an error → the input's value is reset after each pick, so `onChange` fires again (manual check, Task 3 Step 5).
2. **The previous session was exported in the other language** → categories still match on `name`, the French title doesn't matter (`findPrevious` test, Task 1).
3. **Half medians** (5 then 5.5) → counts as better, not same (`evolution` test, Task 1).
4. **The wrong file is picked** — the Markdown export, a JSON array, a future `version: 2` file → error message, the current import is untouched (`parseSessionExport` tests, Task 1; manual check, Task 3).
5. **A stale or corrupted `localStorage` value, or storage blocked** → ignored, the recap still renders with no comparison (storage tests, Task 1).

---

### Task 1: Session export format, comparison and storage

**Files:**
- Create: `src/lib/sessionHistory.ts`
- Test: `src/lib/sessionHistory.test.ts`

**Interfaces:**
- Consumes: `medianScore`, `MAX_SCORE` from `src/lib/voteScore.ts`; `localizeCategory(category, lang)` from `src/lib/localizeCategory.ts`; `LANG`, `Lang` from `src/lib/i18n.ts`; `Category`, `ClientSessionState` from `src/types.ts`.
- Produces:
  - `interface CategoryExport { name: string; title: string; votes: number; median: number | null; notes: string }`
  - `interface SessionExport { version: 1; date: string; categories: CategoryExport[] }`
  - `type Evolution = 'better' | 'same' | 'worse'`
  - `toSessionExport(session: Pick<ClientSessionState, 'categories' | 'allResults'>, date?: Date, lang?: Lang): SessionExport`
  - `parseSessionExport(text: string): SessionExport | null`
  - `exportDate(day: string): Date`
  - `evolution(previous: number | null, current: number | null): Evolution | null`
  - `findPrevious(previous: SessionExport | null, category: Category): CategoryExport | undefined`
  - `loadPreviousSession(code: string): SessionExport | null`, `savePreviousSession(code: string, data: SessionExport): void`, `clearPreviousSession(code: string): void`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sessionHistory.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoryResult } from '../types';
import {
  clearPreviousSession,
  evolution,
  exportDate,
  findPrevious,
  loadPreviousSession,
  parseSessionExport,
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

const exported = toSessionExport({ categories, allResults }, new Date(2026, 9, 6), 'fr');

describe('toSessionExport', () => {
  it('keeps what the recap shows, with the stable name and the median score', () => {
    expect(exported).toEqual({
      version: 1,
      date: '2026-10-06',
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
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/sessionHistory.test.ts`
Expected: FAIL — `Failed to resolve import "./sessionHistory"`.

- [ ] **Step 3: Implement the module**

Create `src/lib/sessionHistory.ts`:

```ts
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
  session: Pick<ClientSessionState, 'categories' | 'allResults'>,
  date = new Date(),
  lang: Lang = LANG,
): SessionExport {
  return {
    version: 1,
    date: isoDay(date),
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

function isCategoryExport(value: unknown): value is CategoryExport {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.title === 'string' &&
    typeof value.notes === 'string' &&
    Number.isInteger(value.votes) &&
    (value.votes as number) >= 0 &&
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
  const categories: unknown[] = value.categories;
  if (!categories.every(isCategoryExport)) return null;
  return {
    version: 1,
    date: value.date,
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

/* ─── The import, kept per session so a reload keeps it (storage may be missing or blocked) ─── */

const storageKey = (code: string) => `previousSession:${code}`;

export function loadPreviousSession(code: string): SessionExport | null {
  try {
    const raw = localStorage.getItem(storageKey(code));
    return raw === null ? null : parseSessionExport(raw);
  } catch {
    return null;
  }
}

export function savePreviousSession(code: string, data: SessionExport) {
  try {
    localStorage.setItem(storageKey(code), JSON.stringify(data));
  } catch {
    /* Storage blocked: the import lasts until the page is reloaded */
  }
}

export function clearPreviousSession(code: string) {
  try {
    localStorage.removeItem(storageKey(code));
  } catch {
    /* Storage blocked: nothing was stored */
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx vitest run src/lib/sessionHistory.test.ts`
Expected: PASS (all tests). Then `npx vitest run` — whole suite passes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sessionHistory.ts src/lib/sessionHistory.test.ts
git commit -m "feat: add the session JSON format, comparison and stored import"
```

---

### Task 2: Trim the Markdown and PDF exports, add the JSON download

**Files:**
- Modify: `src/lib/exportReport.ts` (whole file)
- Modify: `src/lib/i18n.ts` — `en.report` (lines ~280-293), `fr.report` (lines ~517-530), `en.notes` (lines ~264-271), `fr.notes` (lines ~501-508)
- Modify: `src/components/facilitator/ReportExports.tsx`
- Test: `src/lib/exportReport.test.ts`

**Interfaces:**
- Consumes: `toSessionExport` from Task 1.
- Produces: `generateMarkdown(session, date?, lang?): string` (trimmed), `downloadMarkdown(session)`, `downloadPDF(session): Promise<void>`, `downloadJSON(session): void`, and `formatDate(date: Date, lang?: Lang): string` — now exported, used by Task 3. Message `t.notes.downloadJson`.

- [ ] **Step 1: Rewrite the Markdown tests for the trimmed content**

In `src/lib/exportReport.test.ts`, keep the imports, `categories`, `finished()` and `empty()` helpers, and replace the whole `describe('generateMarkdown', …)` block with:

```ts
const funVotes: CategoryResult = {
  categoryIndex: 0,
  votes: [
    { color: 'orange', trend: 'stable' },
    { color: 'orange', trend: 'up' },
  ],
  notes: 'we laughed a lot',
};

const section = (md: string, from: string, to?: string) =>
  md.slice(md.indexOf(from), to ? md.indexOf(to) : undefined);

describe('generateMarkdown', () => {
  it('sums up each category as on the recap: votes and median', () => {
    const md = generateMarkdown(finished([funVotes, empty(1)]));
    expect(md).toContain('| # | Category | Votes | Median |');
    expect(md).toContain('| 1 | Fun | 2 | 🟠 ↗ |');
    expect(md).toContain('| 2 | Ownership | 0 | — |');
  });

  it('gives each category its vote count, median and note', () => {
    const md = generateMarkdown(finished([funVotes, empty(1)]));
    expect(md).toContain('## Notes');
    expect(section(md, '### 1. Fun', '### 2. Ownership')).toBe(
      '### 1. Fun (2 votes)\n\n🟠 ↗\n\nwe laughed a lot\n\n',
    );
    expect(section(md, '### 2. Ownership')).toBe('### 2. Ownership (0 votes)\n\n—\n\n');
  });

  it('leaves out what the recap does not show', () => {
    const md = generateMarkdown(finished([funVotes, empty(1)]));
    expect(md).not.toContain('ABC234');
    expect(md).not.toContain('Participants');
    expect(md).not.toContain('/9');
    expect(md).not.toContain('🟢');
    expect(md).not.toContain('Trend');
    expect(md).not.toContain('**Green:**');
    expect(md).not.toContain('Discussion Notes');
  });

  it('writes the report in French for French users', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]), new Date(2026, 9, 5), 'fr');
    expect(md).toContain('# Squad Health Check — 5 octobre 2026');
    expect(md).toContain('| # | Catégorie | Votes | Médiane |');
    expect(md).toContain('| 2 | Responsabilité | 0 | — |');
    expect(md).toContain('### 2. Responsabilité (0 votes)');
  });

  it('lists no names, even when they are available', () => {
    const md = generateMarkdown(
      finished([{ categoryIndex: 0, votes: [{ color: 'green', trend: 'up' }], notes: '' }, empty(1)], {
        0: [{ id: 'fac', name: 'Alice', vote: { color: 'green', trend: 'up' } }],
      }),
    );
    expect(md).not.toContain('Alice');
  });
});
```

Note: the `finished()` fixture's facilitator is named Alice, but participant names were never written to the report; `'Alice'` must not appear anywhere.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/exportReport.test.ts`
Expected: FAIL — e.g. the `| # | Category | Votes | Median |` header is missing and `ABC234` is present.

- [ ] **Step 3: Update the report and notes messages**

In `src/lib/i18n.ts`, replace `en.report` with:

```ts
  report: {
    category: 'Category',
    votes: 'Votes',
    median: 'Median',
    notes: 'Notes',
  },
```

and `fr.report` with:

```ts
  report: {
    category: 'Catégorie',
    votes: 'Votes',
    median: 'Médiane',
    notes: 'Notes',
  },
```

In `en.notes`, after `downloadPdf: 'Download PDF',` add `downloadJson: 'Download JSON',`. In `fr.notes`, after `downloadPdf: 'Télécharger le PDF',` add `downloadJson: 'Télécharger le JSON',`.

- [ ] **Step 4: Rewrite `src/lib/exportReport.ts`**

Replace the whole file with:

```ts
import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';
import { LANG, Lang, messagesFor, t } from './i18n';
import { localizeCategory } from './localizeCategory';
import { toSessionExport } from './sessionHistory';
import { medianScore, scoreCell } from './voteScore';

/* The exports hold what the facilitator recap shows: per category, its votes, median and note. */

const COLOR_EMOJI: Record<VoteColor, string> = { green: '🟢', orange: '🟠', red: '🔴' };
const TREND_ARROW: Record<VoteTrend, string> = { up: '↗', stable: '→', down: '↘' };

/** Median as emoji and arrow, e.g. "🟠 ↗"; a dash without votes */
function medianCell(votes: Vote[]): string {
  const score = medianScore(votes);
  if (score === null) return '—';
  const { color, trend } = scoreCell(score);
  return `${COLOR_EMOJI[color]} ${TREND_ARROW[trend]}`;
}

export const formatDate = (date: Date, lang: Lang = LANG) =>
  date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

/** Each result with its category number and title, in recap order */
const rows = (session: ClientSessionState, lang: Lang) =>
  session.allResults.map((result) => ({
    n: result.categoryIndex + 1,
    title: localizeCategory(session.categories[result.categoryIndex], lang).title,
    result,
  }));

/* ─── Markdown generation ─── */

export function generateMarkdown(
  session: ClientSessionState,
  date = new Date(),
  lang: Lang = LANG,
): string {
  const m = messagesFor(lang);
  const r = m.report;
  let md = `# Squad Health Check — ${formatDate(date, lang)}\n\n`;
  md += `| # | ${r.category} | ${r.votes} | ${r.median} |\n`;
  md += `|---|----------|-------|--------|\n`;
  for (const { n, title, result } of rows(session, lang)) {
    md += `| ${n} | ${title} | ${result.votes.length} | ${medianCell(result.votes)} |\n`;
  }

  md += `\n## ${r.notes}\n\n`;
  for (const { n, title, result } of rows(session, lang)) {
    md += `### ${n}. ${title} (${m.votes(result.votes.length)})\n\n${medianCell(result.votes)}\n\n`;
    if (result.notes) md += `${result.notes}\n\n`;
  }

  return md;
}

/* ─── Download helpers ─── */

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(session: ClientSessionState): void {
  downloadFile(generateMarkdown(session), `squad-health-check-${session.code}.md`, 'text/markdown');
}

/** The recap as JSON, imported in the next session to compare with it */
export function downloadJSON(session: ClientSessionState): void {
  downloadFile(
    JSON.stringify(toSessionExport(session), null, 2),
    `squad-health-check-${session.code}.json`,
    'application/json',
  );
}

/** Median in words, e.g. "Orange, improving": jsPDF's built-in fonts have no arrows */
function pdfMedian(votes: Vote[]): string {
  const score = medianScore(votes);
  if (score === null) return '—';
  const { color, trend } = scoreCell(score);
  return `${t.colors[color]}, ${t.trends[trend].toLowerCase()}`;
}

/** jsPDF is loaded on demand: only the facilitator ever exports. */
export async function downloadPDF(session: ClientSessionState): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const results = rows(session, LANG);

  /* Title */
  doc.setFontSize(22);
  doc.setTextColor(74, 144, 217);
  doc.text('Squad Health Check', 14, 22);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(formatDate(new Date()), 14, 30);

  /* Summary table */
  autoTable(doc, {
    startY: 36,
    head: [[t.report.category, t.report.votes, t.report.median]],
    body: results.map(({ n, title, result }) => [
      `${n}. ${title}`,
      String(result.votes.length),
      pdfMedian(result.votes),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [74, 144, 217], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' } },
  });

  /* Notes */
  let y = (doc as any).lastAutoTable.finalY + 12;

  for (const { n, title, result } of results) {
    if (!result.notes) continue;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${n}. ${title}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(result.notes, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 10;
  }

  doc.save(`squad-health-check-${session.code}.pdf`);
}
```

- [ ] **Step 5: Add the JSON button**

In `src/components/facilitator/ReportExports.tsx`, import `downloadJSON` alongside the other downloads:

```tsx
import { downloadJSON, downloadMarkdown, downloadPDF } from '../../lib/exportReport';
```

and add after the PDF button:

```tsx
      <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadJSON(session)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadJson}
      </Button>
```

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run` — all pass.
Run: `grep -rn "countColors\|countTrends\|report\.\(sessionCode\|participants\|summary\|trend\|score\|details\|discussion\|session\|pdfTrends\)" src` — no output.
Run: `npm run build` — succeeds, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/exportReport.ts src/lib/exportReport.test.ts src/lib/i18n.ts src/components/facilitator/ReportExports.tsx
git commit -m "feat: export only what the facilitator recap shows, and as JSON"
```

---

### Task 3: Import and remove the previous session

**Files:**
- Modify: `src/components/facilitator/ReportExports.tsx`
- Modify: `src/components/facilitator/FacilitatorView.tsx`
- Modify: `src/lib/i18n.ts` — `en.notes`, `fr.notes`
- Modify: `src/styles/main.css`

**Interfaces:**
- Consumes: `SessionExport`, `parseSessionExport`, `exportDate`, `loadPreviousSession`, `savePreviousSession`, `clearPreviousSession` (Task 1); `formatDate`, `downloadJSON` (Task 2).
- Produces: `FacilitatorView` holds `previous: SessionExport | null` in state; Task 4 passes it to `FinishedNotes`. Messages `t.notes.importPrevious`, `t.notes.comparedWith(date)`, `t.notes.removePrevious`, `t.notes.invalidImport`.

No unit test: the repo only tests `.ts` modules in a node environment; the logic this task wires up is covered by Task 1. Verify by build and in the browser.

- [ ] **Step 1: Add the messages**

In `en.notes`, after `downloadJson`, add:

```ts
    importPrevious: 'Import previous session',
    comparedWith: (date: string) => `Compared with the session of ${date}`,
    removePrevious: 'Remove',
    invalidImport: 'This file is not a Squad Health Check JSON export.',
```

In `fr.notes`, after `downloadJson`, add:

```ts
    importPrevious: 'Importer la session précédente',
    comparedWith: (date) => `Comparé à la session du ${date}`,
    removePrevious: 'Retirer',
    invalidImport: "Ce fichier n'est pas un export JSON Squad Health Check.",
```

- [ ] **Step 2: Rewrite `ReportExports`**

Replace `src/components/facilitator/ReportExports.tsx` with:

```tsx
import {
  Button,
  BUTTON_VARIANT,
  Card,
  Icon,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ChangeEvent, useRef, useState } from 'react';
import { ClientSessionState } from '../../types';
import { downloadJSON, downloadMarkdown, downloadPDF, formatDate } from '../../lib/exportReport';
import { exportDate, parseSessionExport, SessionExport } from '../../lib/sessionHistory';
import { t } from '../../lib/i18n';

const warn = (err: unknown) => console.warn('[export]', err);

interface Props {
  session: ClientSessionState;
  /** The imported previous session, compared with on the recap */
  previous: SessionExport | null;
  onImport: (previous: SessionExport) => void;
  onRemove: () => void;
}

/** Downloads of the finished session's report, and the import of the previous one to compare with. */
function ReportExports({ session, previous, onImport, onRemove }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared so that picking the same file again still fires a change
    input.value = '';
    if (!file) return;
    const data = parseSessionExport(await file.text().catch(() => ''));
    setInvalid(!data);
    if (data) onImport(data);
  };

  return (
    <Card className="card-body report-exports">
      <Button onClick={() => downloadMarkdown(session)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadMarkdown}
      </Button>
      <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadPDF(session).catch(warn)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadPdf}
      </Button>
      <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadJSON(session)}>
        <Icon name={ICON_NAME.download} />
        {t.notes.downloadJson}
      </Button>

      <Button variant={BUTTON_VARIANT.ghost} onClick={() => fileInput.current?.click()}>
        <Icon name={ICON_NAME.upload} />
        {t.notes.importPrevious}
      </Button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importFile} />

      {invalid && (
        <Message className="message-full" color={MESSAGE_COLOR.critical} dismissible={false}>
          <MessageIcon name={ICON_NAME.triangleExclamation} />
          <MessageBody>{t.notes.invalidImport}</MessageBody>
        </Message>
      )}

      {previous && (
        <div className="inline wrap report-exports__previous">
          <Text preset={TEXT_PRESET.caption}>{t.notes.comparedWith(formatDate(exportDate(previous.date)))}</Text>
          <Button variant={BUTTON_VARIANT.ghost} onClick={onRemove}>
            <Icon name={ICON_NAME.trash} />
            {t.notes.removePrevious}
          </Button>
        </div>
      )}
    </Card>
  );
}

export default ReportExports;
```

- [ ] **Step 3: Hold the import in `FacilitatorView`**

In `src/components/facilitator/FacilitatorView.tsx`:

Add the import:

```tsx
import {
  clearPreviousSession,
  loadPreviousSession,
  savePreviousSession,
  SessionExport,
} from '../../lib/sessionHistory';
```

After the `dismissHint` function, add:

```tsx
  const [previous, setPrevious] = useState(() => loadPreviousSession(session.code));
  const importPrevious = (data: SessionExport) => {
    setPrevious(data);
    savePreviousSession(session.code, data);
  };
  const removePrevious = () => {
    setPrevious(null);
    clearPreviousSession(session.code);
  };
```

Replace `<ReportExports session={session} />` with:

```tsx
<ReportExports session={session} previous={previous} onImport={importPrevious} onRemove={removePrevious} />
```

- [ ] **Step 4: Style the import line**

In `src/styles/main.css`, after the `.finished-notes__item + .finished-notes__item` rule, add:

```css
.report-exports__previous {
  justify-content: space-between;
}
```

- [ ] **Step 5: Build and check in the browser**

Run: `npx vitest run` and `npm run build` — both succeed.

Run `npm run dev`, create a session, vote on two categories, finish. In the facilitator window:
1. Click "Download JSON": the file holds `version`, `date`, and one entry per category with `name`, `title`, `votes`, `median`, `notes`.
2. Click "Import previous session" and pick the Markdown export: the error message shows, nothing else changes.
3. Pick the JSON: the error goes, "Compared with the session of {today}" shows.
4. Reload: the line is still there.
5. Click "Remove": the line goes. Import the same JSON again: it comes back (the input was reset).

- [ ] **Step 6: Commit**

```bash
git add src/components/facilitator/ReportExports.tsx src/components/facilitator/FacilitatorView.tsx src/lib/i18n.ts src/styles/main.css
git commit -m "feat: import the previous session's JSON on the facilitator recap"
```

---

### Task 4: Show the previous median and evolution per category

**Files:**
- Create: `src/components/MedianBadge.tsx`
- Modify: `src/components/VoteSummary.tsx`
- Create: `src/components/facilitator/PreviousResult.tsx`
- Modify: `src/components/facilitator/FinishedNotes.tsx`
- Modify: `src/components/facilitator/FacilitatorView.tsx`
- Modify: `src/lib/i18n.ts` — `en.notes`, `fr.notes`
- Modify: `src/styles/main.css`

**Interfaces:**
- Consumes: `CategoryExport`, `Evolution`, `evolution`, `findPrevious`, `SessionExport` (Task 1); `previous` state in `FacilitatorView` (Task 3); `medianScore` from `src/lib/voteScore.ts`.
- Produces: `MedianBadge({ score: number; large?: boolean })` default export; `PreviousResult({ previous: CategoryExport; votes: Vote[] | undefined })` default export; `FinishedNotes` gains prop `previous: SessionExport | null`. Messages `t.notes.previous`, `t.notes.evolution.{better,same,worse}`.

No unit test (component only; `evolution` and `findPrevious` are tested in Task 1). Verify by build and in the browser.

- [ ] **Step 1: Add the messages**

In `en.notes`, after `invalidImport`, add:

```ts
    previous: 'Previous:',
    evolution: { better: 'Better', same: 'Same', worse: 'Worse' },
```

In `fr.notes`, after `invalidImport`, add:

```ts
    previous: 'Précédente :',
    evolution: { better: 'Mieux', same: 'Pareil', worse: 'Moins bien' },
```

- [ ] **Step 2: Extract `MedianBadge` from `VoteSummary`**

Create `src/components/MedianBadge.tsx`:

```tsx
import { Badge, BADGE_SIZE, Icon } from '@ovhcloud/ods-react';
import { scoreCell } from '../lib/voteScore';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

/** A median score as one badge in its colour, reading its trend. `large` for the shared screen. */
function MedianBadge({ score, large = false }: { score: number; large?: boolean }) {
  const cell = scoreCell(score);
  const color = COLOR_OPTIONS.find((o) => o.value === cell.color)!;
  const trend = TREND_OPTIONS.find((o) => o.value === cell.trend)!;

  return (
    <Badge className="vote-summary__badge" color={color.badge} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
      <span className="visually-hidden">{color.label}, </span>
      <span>{trend.label}</span>
      <Icon name={trend.icon} aria-hidden />
    </Badge>
  );
}

export default MedianBadge;
```

Replace `src/components/VoteSummary.tsx` with:

```tsx
import { Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { medianScore } from '../lib/voteScore';
import { t } from '../lib/i18n';
import MedianBadge from './MedianBadge';

/** Result of a category: its median health, as one badge in the colour, reading the trend, after a "Median:" prefix unless `prefix` is off. `large` for the shared screen. */
function VoteSummary({ votes, large = false, prefix = true }: { votes: Vote[]; large?: boolean; prefix?: boolean }) {
  const score = medianScore(votes);
  if (score === null) return <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>;

  return (
    <span className="inline vote-summary">
      {prefix && (
        <Text preset={large ? TEXT_PRESET.heading4 : TEXT_PRESET.span} as="span">{t.results.medianPrefix}</Text>
      )}
      <MedianBadge score={score} large={large} />
    </span>
  );
}

export default VoteSummary;
```

- [ ] **Step 3: Create `PreviousResult`**

Create `src/components/facilitator/PreviousResult.tsx`:

```tsx
import { Icon, ICON_NAME, Text, TEXT_PRESET, type IconName } from '@ovhcloud/ods-react';
import { Vote } from '../../types';
import { CategoryExport, Evolution, evolution } from '../../lib/sessionHistory';
import { medianScore } from '../../lib/voteScore';
import { t } from '../../lib/i18n';
import MedianBadge from '../MedianBadge';

const EVOLUTION_ICON: Record<Evolution, IconName> = {
  better: ICON_NAME.arrowUp,
  same: ICON_NAME.equal,
  worse: ICON_NAME.arrowDown,
};

/** The category's median in the imported previous session, and how its health moved since */
function PreviousResult({ previous, votes }: { previous: CategoryExport; votes: Vote[] | undefined }) {
  const change = evolution(previous.median, votes ? medianScore(votes) : null);

  return (
    <span className="inline previous-result">
      <Text preset={TEXT_PRESET.span} as="span">{t.notes.previous}</Text>
      {previous.median === null ? (
        <Text preset={TEXT_PRESET.caption}>{t.results.noVotes}</Text>
      ) : (
        <MedianBadge score={previous.median} />
      )}
      {change && (
        <span className="inline previous-result__evolution">
          <Icon name={EVOLUTION_ICON[change]} aria-hidden />
          {t.notes.evolution[change]}
        </span>
      )}
    </span>
  );
}

export default PreviousResult;
```

- [ ] **Step 4: Render it in `FinishedNotes`**

In `src/components/facilitator/FinishedNotes.tsx`:

Add imports:

```tsx
import { findPrevious, SessionExport } from '../../lib/sessionHistory';
import PreviousResult from './PreviousResult';
```

Extend `Props`:

```tsx
interface Props {
  session: ClientSessionState;
  /** The imported previous session, compared with per category */
  previous: SessionExport | null;
  onChangeNote: (categoryIndex: number, value: string) => void;
}
```

Change the signature to `function FinishedNotes({ session, previous, onChangeNote }: Props)` and replace the `.map((i) => ( … ))` body with:

```tsx
      {summaryIndexes(session).map((i) => {
        const before = findPrevious(previous, session.categories[i]);
        return (
          <div key={i} className="stack finished-notes__item">
            <div className="inline wrap finished-notes__heading">
              <Text preset={TEXT_PRESET.heading5}>
                {i + 1}. {localizeCategory(session.categories[i]).title}
                {session.categoryResults[i] && ` (${t.votes(session.categoryResults[i].length)})`}
              </Text>
              {session.categoryResults[i] ? (
                <VoteSummary votes={session.categoryResults[i]} />
              ) : (
                <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
              )}
              {before && <PreviousResult previous={before} votes={session.categoryResults[i]} />}
            </div>
            <NoteFields
              note={session.facilitatorNotes[i] ?? EMPTY_NOTE}
              hideLabel
              onChange={(_field, value) => onChangeNote(i, value)}
            />
          </div>
        );
      })}
```

- [ ] **Step 5: Pass the import down from `FacilitatorView`**

In `src/components/facilitator/FacilitatorView.tsx`, replace:

```tsx
<FinishedNotes session={session} onChangeNote={actions.changeNote} />
```

with:

```tsx
<FinishedNotes session={session} previous={previous} onChangeNote={actions.changeNote} />
```

- [ ] **Step 6: Style the evolution**

In `src/styles/main.css`, after the `.vote-summary__badge` rule, add:

```css
.previous-result__evolution {
  gap: 4px;
}
```

- [ ] **Step 7: Build and check in the browser**

Run: `npx vitest run` and `npm run build` — both succeed.

With `npm run dev`: finish a session A with some votes, download its JSON. Create session B with the same categories plus one new one, vote differently, finish, import A's JSON. Check:
1. Each shared category shows `Previous: [badge]` and the right `Better` / `Same` / `Worse` with its arrow or equal icon.
2. The new category shows no comparison line.
3. A category without votes in A shows `Previous: No votes` and no evolution.
4. Switch the language: labels follow, matching still works.
5. The shared recap (participant window) shows no comparison.

- [ ] **Step 8: Commit**

```bash
git add src/components/MedianBadge.tsx src/components/VoteSummary.tsx src/components/facilitator/PreviousResult.tsx src/components/facilitator/FinishedNotes.tsx src/components/facilitator/FacilitatorView.tsx src/lib/i18n.ts src/styles/main.css
git commit -m "feat: compare each category with the previous session on the facilitator recap"
```

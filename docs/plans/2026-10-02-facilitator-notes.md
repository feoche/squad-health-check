# Facilitator Notes Implementation Plan

Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make discussion notes private to the facilitator: remove them from the screen-shared session view and give the facilitator a separate notes window with notes + takeaway per category and a running summary.

**Architecture:** Notes move from the world-readable `sessions/{code}/notes` node to a facilitator-only `sessions/{code}/facilitator` node, enforced by `database.rules.json`. `sessionStore.subscribeSession` attaches the facilitator-only listeners only for the facilitator; `deriveClientState` (pure, tested) exposes `facilitatorNotes` and `categoryResults`. A new route `/session/:code/notes` renders `FacilitatorNotesPage`, opened from the session view in a named popup window. Exports move to `src/lib/exportReport.ts` and are only offered on the notes page.

**Tech Stack:** React 18, TypeScript, Vite 5, `@ovhcloud/ods-react` 19.7, Firebase JS SDK 12 (Realtime Database), Vitest 3, jsPDF + jspdf-autotable.

**Spec:** `docs/specs/2026-10-02-facilitator-notes-design.md`

## Global Constraints

- Notes: string, max **5000** chars. Takeaway: string, max **300** chars.
- Database paths: `sessions/{code}/facilitator/{idx}: { notes?: string, takeaway?: string }` and `sessions/{code}/closed/{idx}: true`. The old `notes` node is removed; no migration.
- Notes and takeaways are facilitator-only everywhere: UI, rules, recap and exports.
- The screen-share view (`SessionPage`) never renders notes or takeaways and has no download buttons.
- UI uses ODS components and ODS design tokens only (see `src/styles/main.css` header).
- Router is `HashRouter`; app URLs are `${origin}${pathname}#/…` (see `Lobby.tsx` share link).
- Commits: plain conventional messages, no co-author or tool attribution lines.

## Review Focus

1. **Sessions with 10+ categories** — the facilitator must still see results of closed category `10`, `11`… mid-session (rules and `readableVoteIndexes` must not compare indexes as strings). Test in Task 2.
2. **A participant opening `/#/session/CODE/notes`** (forwarded link) — sees "Only the facilitator can open notes", and no facilitator-only listener is attached (no `PERMISSION_DENIED` warnings). Test in Task 2 (participants get no notes) + manual check in Task 5.
3. **A category revealed with zero votes** (facilitator forced reveal) — summary and exports show "No votes" / `—`, not a fake "Mostly green". Test in Task 3.
4. **Typing in the notes window while the other window (or a second facilitator tab) edits the same field** — the cursor must not jump; the focused field keeps local text. Manual check in Task 4.
5. **Facilitator reloads the notes window mid-session** — summary rebuilds from Firebase, including results of closed categories. Test in Task 2 (`categoryResults` + closed indexes) + manual check in Task 5.

---

### Task 1: Screen-share view without notes

**Files:**
- Modify: `src/components/ResultsGrid.tsx`
- Modify: `src/components/VotingView.tsx`
- Modify: `src/pages/SessionPage.tsx:150-155` (`handleUpdateNotes`) and the `VotingView` usage

**Interfaces:**
- Consumes: nothing new.
- Produces: `ResultsGrid` props are now `{ votes, isFacilitator, isLastCategory, onNextCategory, onEndSession }`; `VotingView` props are now `{ session, onSubmitVote, onRevealVotes, onNextCategory, onEndSession }`.

- [ ] **Step 1: Strip notes from `ResultsGrid`**

In `src/components/ResultsGrid.tsx`:

Replace the import block with:

```tsx
import {
  Badge,
  Button,
  Card,
  Icon,
  ICON_NAME,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
```

Replace the `Props` interface with:

```tsx
interface Props {
  votes: Vote[];
  isFacilitator: boolean;
  isLastCategory: boolean;
  onNextCategory: () => void;
  onEndSession: () => void;
}
```

Replace the component signature with:

```tsx
function ResultsGrid({
  votes,
  isFacilitator,
  isLastCategory,
  onNextCategory,
  onEndSession,
}: Props) {
```

Delete the whole `{isFacilitator ? ( <FormField>… ) : ( <div className="stack">…Discussion Notes… </div> )}` block (between the Trend `stack` and the `{isFacilitator && ( <div className="actions">` block).

- [ ] **Step 2: Stop passing notes from `VotingView`**

In `src/components/VotingView.tsx`, replace the `Props` interface and signature with:

```tsx
interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  onRevealVotes: () => void;
  onNextCategory: () => void;
  onEndSession: () => void;
}

function VotingView({
  session,
  onSubmitVote,
  onRevealVotes,
  onNextCategory,
  onEndSession,
}: Props) {
```

and in the `<ResultsGrid … />` element delete these props:

```tsx
          notes={session.notes[session.currentCategoryIndex] || ''}
          onUpdateNotes={(notes) =>
            onUpdateNotes(session.currentCategoryIndex, notes)
          }
```

- [ ] **Step 3: Drop the notes handler from `SessionPage`**

In `src/pages/SessionPage.tsx` delete:

```tsx
  const handleUpdateNotes = useCallback(
    (categoryIndex: number, notes: string) => {
      if (session) store.updateNotes(session, categoryIndex, notes).catch(warn);
    },
    [session],
  );
```

and the `onUpdateNotes={handleUpdateNotes}` line in the `<VotingView … />` element.

- [ ] **Step 4: Verify build and tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass. `grep -rn "onUpdateNotes\|session.notes" src` returns nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsGrid.tsx src/components/VotingView.tsx src/pages/SessionPage.tsx
git commit -m "feat: remove discussion notes from the shared session view"
```

---

### Task 2: Facilitator-only data layer

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/deriveClientState.ts`
- Modify: `src/lib/deriveClientState.test.ts`
- Modify: `src/lib/sessionStore.ts`
- Modify: `database.rules.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `types.ts`: `interface FacilitatorNote { notes: string; takeaway: string }`; `CategoryResult` gains `takeaway: string`; `ClientSessionState.notes` is **removed** and replaced by `facilitatorNotes: Record<number, FacilitatorNote>` and `categoryResults: Record<number, Vote[]>`.
  - `deriveClientState.ts`: `RawSession` loses `notes`, gains `facilitator: Indexed<Partial<FacilitatorNote>> | null` and `closed: Indexed<true> | null`; `readableVoteIndexes(state, categoryCount, closed?: Indexed<true> | null, isFacilitator?: boolean): number[]`; new `summaryIndexes(session: Pick<ClientSessionState, 'phase' | 'currentCategoryIndex' | 'categories'>): number[]`.
  - `sessionStore.ts`: `type NoteField = keyof FacilitatorNote` (exported); `updateFacilitatorNote(s: ClientSessionState, categoryIndex: number, field: NoteField, value: string): Promise<void>`; `updateNotes` is **removed**; `nextCategory` also writes `closed/{idx}`.

- [ ] **Step 1: Update the test fixtures and write the failing tests**

In `src/lib/deriveClientState.test.ts`:

Change the import to:

```ts
import {
  RawSession,
  deriveClientState,
  readableVoteIndexes,
  shouldAutoReveal,
  summaryIndexes,
} from './deriveClientState';
```

In `raw()`, replace `notes: null,` with:

```ts
    facilitator: null,
    closed: null,
```

In `'maps lobby state with identity fields'`, replace `expect(s.notes).toEqual({});` with:

```ts
    expect(s.facilitatorNotes).toEqual({});
    expect(s.categoryResults).toEqual({});
```

In `'reads sparse arrays the same way as objects (RTDB integer keys)'`, replace `notes: [null, 'about learning', 'about teamwork'],` with `facilitator: [null, { notes: 'about learning' }, { takeaway: 'teamwork ok' }],` and replace `expect(s.notes).toEqual({ 1: 'about learning', 2: 'about teamwork' });` with:

```ts
    expect(s.facilitatorNotes).toEqual({
      1: { notes: 'about learning', takeaway: '' },
      2: { notes: '', takeaway: 'teamwork ok' },
    });
```

Replace the test `'builds allResults with notes for every category when finished'` with these two:

```ts
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
```

In `describe('readableVoteIndexes', …)` add:

```ts
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
```

Add a new `describe` block:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/deriveClientState.test.ts`
Expected: FAIL — `summaryIndexes` is not exported, `facilitatorNotes` / `categoryResults` undefined.

- [ ] **Step 3: Update `src/types.ts`**

Replace `CategoryResult` with:

```ts
export interface CategoryResult {
  categoryIndex: number;
  votes: Vote[];
  notes: string;
  takeaway: string;
}

/** Private to the facilitator — never sent to participants (see database.rules.json) */
export interface FacilitatorNote {
  notes: string;
  takeaway: string;
}
```

In `ClientSessionState`, replace `notes: Record<number, string>;` with:

```ts
  /** Facilitator-only notes per category index (empty for participants) */
  facilitatorNotes: Record<number, FacilitatorNote>;
  /** Votes of every category whose votes this user has loaded, by index */
  categoryResults: Record<number, Vote[]>;
```

- [ ] **Step 4: Update `src/lib/deriveClientState.ts`**

Replace the import with:

```ts
import {
  Category,
  CategoryResult,
  ClientSessionState,
  FacilitatorNote,
  SessionPhase,
  Vote,
} from '../types';
```

In `RawSession`, replace `notes: Indexed<string> | null;` with:

```ts
  /** Only listened to by the facilitator — the rules deny everyone else */
  facilitator: Indexed<Partial<FacilitatorNote>> | null;
  closed: Indexed<true> | null;
```

In `deriveClientState`, replace the `const notes … ;` block and the `allResults` block with:

```ts
  const isFacilitator = facilitatorId === myId;

  const facilitatorNotes: Record<number, FacilitatorNote> = {};
  if (isFacilitator) {
    categories.forEach((_, i) => {
      const n = at(raw.facilitator, i);
      if (n?.notes || n?.takeaway) {
        facilitatorNotes[i] = { notes: n.notes ?? '', takeaway: n.takeaway ?? '' };
      }
    });
  }

  const categoryResults: Record<number, Vote[]> = {};
  categories.forEach((_, i) => {
    if (at(raw.votes, i) !== undefined) categoryResults[i] = votesAt(raw, i);
  });

  const allResults: CategoryResult[] =
    phase === 'finished'
      ? categories.map((_, i) => ({
          categoryIndex: i,
          votes: votesAt(raw, i),
          notes: facilitatorNotes[i]?.notes ?? '',
          takeaway: facilitatorNotes[i]?.takeaway ?? '',
        }))
      : [];
```

In the returned object, replace `isFacilitator: facilitatorId === myId,` with `isFacilitator,` and replace `notes,` with:

```ts
    facilitatorNotes,
    categoryResults,
```

Replace `readableVoteIndexes` with:

```ts
/**
 * Vote indexes the rules allow reading. Listening to any other index gets the
 * listener cancelled with PERMISSION_DENIED, so only these may be attached.
 * The facilitator may also read categories already closed by "Next category".
 */
export function readableVoteIndexes(
  state: SessionStateNode,
  categoryCount: number,
  closed: Indexed<true> | null = null,
  isFacilitator = false,
): number[] {
  const all = Array.from({ length: categoryCount }, (_, i) => i);
  if (state.phase === 'finished') return all;
  return all.filter(
    (i) =>
      (state.phase === 'revealed' && i === state.currentCategoryIndex) ||
      (isFacilitator && at(closed, i) === true),
  );
}

/** Categories listed in the notes-page summary: those already moved past, or all once finished. */
export function summaryIndexes(
  session: Pick<ClientSessionState, 'phase' | 'currentCategoryIndex' | 'categories'>,
): number[] {
  const count =
    session.phase === 'finished'
      ? session.categories.length
      : session.phase === 'lobby'
        ? 0
        : session.currentCategoryIndex;
  return Array.from({ length: count }, (_, i) => i);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/deriveClientState.test.ts`
Expected: PASS (all, including the pre-existing `readableVoteIndexes` tests).

- [ ] **Step 6: Update `src/lib/sessionStore.ts`**

Change the types import to:

```ts
import { Category, ClientSessionState, FacilitatorNote, Vote } from '../types';
```

In `subscribeSession`, replace everything from `const raw: RawSession = {` down to (and including) the five `listen(…)` calls with:

```ts
  const raw: RawSession = {
    meta: null,
    state: null,
    participants: null,
    voters: null,
    votes: {},
    facilitator: null,
    closed: null,
  };
  const unsubs: Unsubscribe[] = [];
  const voteUnsubs = new Map<number, Unsubscribe>();
  let facilitatorListening = false;

  const isFacilitator = () => raw.meta?.facilitatorId === uid;

  const emit = () => {
    const state = deriveClientState(code, raw, uid);
    if (state) onState(state);
  };

  const warnCancelled = (path: string) => (err: Error) =>
    console.warn(`[session] listener on ${path} cancelled`, err);

  /* Attach vote listeners only where the rules allow reading (see readableVoteIndexes) */
  const syncVoteListeners = () => {
    if (!raw.meta || !raw.state) return;
    const readable = readableVoteIndexes(
      raw.state,
      raw.meta.categories.length,
      raw.closed,
      isFacilitator(),
    );
    for (const i of readable) {
      if (voteUnsubs.has(i)) continue;
      voteUnsubs.set(
        i,
        onValue(
          sessionRef(code, `votes/${i}`),
          (snap: DataSnapshot) => {
            (raw.votes as Record<string, Record<string, Vote>>)[String(i)] = snap.val() ?? {};
            emit();
          },
          (err: Error) => {
            // Expected for participants once the round is closed: keep cached data, re-attach when finished
            voteUnsubs.delete(i);
            warnCancelled(`votes/${i}`)(err);
          },
        ),
      );
    }
  };

  const listen = (key: 'meta' | 'state' | 'participants' | 'voters' | 'facilitator' | 'closed') => {
    unsubs.push(
      onValue(
        sessionRef(code, key),
        (snap: DataSnapshot) => {
          (raw as unknown as Record<string, unknown>)[key] = snap.val();
          if (key === 'meta') syncFacilitatorListeners();
          if (key === 'meta' || key === 'state' || key === 'closed') syncVoteListeners();
          emit();
        },
        warnCancelled(key),
      ),
    );
  };

  /* Facilitator-only nodes: a participant's listener would be cancelled with PERMISSION_DENIED */
  const syncFacilitatorListeners = () => {
    if (facilitatorListening || !isFacilitator()) return;
    facilitatorListening = true;
    listen('facilitator');
    listen('closed');
  };

  listen('meta');
  listen('state');
  listen('participants');
  listen('voters');
```

(The `return () => { … }` cleanup stays as is: it iterates `unsubs` at call time, so the listeners added later are included.)

Replace `nextCategory` with:

```ts
/** Closing the round in the same write keeps the facilitator's vote listener readable. */
export async function nextCategory(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'revealed') return;
  const idx = s.currentCategoryIndex;
  if (idx >= s.categories.length - 1) return;
  await update(sessionRef(s.code), {
    'state/phase': 'voting',
    'state/currentCategoryIndex': idx + 1,
    [`closed/${idx}`]: true,
  });
}
```

Replace `updateNotes` with:

```ts
export type NoteField = keyof FacilitatorNote;

export async function updateFacilitatorNote(
  s: ClientSessionState,
  categoryIndex: number,
  field: NoteField,
  value: string,
): Promise<void> {
  if (!s.isFacilitator) return;
  await set(sessionRef(s.code, `facilitator/${categoryIndex}/${field}`), value);
}
```

- [ ] **Step 7: Update `database.rules.json`**

In the `votes.$idx` `.read` rule, append one alternative so it reads:

```json
            ".read": "auth != null && (root.child('sessions/' + $code + '/state/phase').val() === 'finished' || (root.child('sessions/' + $code + '/state/phase').val() === 'revealed' && root.child('sessions/' + $code + '/state/currentCategoryIndex').val() + '' === $idx) || (root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid && root.child('sessions/' + $code + '/closed/' + $idx).exists()))",
```

Replace the whole `"notes": { … }` block with:

```json
        "facilitator": {
          ".read": "auth != null && root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid",
          ".write": "auth != null && root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid",
          "$idx": {
            "notes": { ".validate": "newData.isString() && newData.val().length <= 5000" },
            "takeaway": { ".validate": "newData.isString() && newData.val().length <= 300" },
            "$other": { ".validate": false }
          }
        },
        "closed": {
          ".read": "auth != null",
          "$idx": {
            ".write": "auth != null && root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid",
            ".validate": "newData.val() === true"
          }
        }
```

Run: `node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8'))"`
Expected: no output (valid JSON).

- [ ] **Step 8: Verify build and all tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass. `grep -rn "updateNotes\|'notes'" src` returns nothing.

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts src/lib/sessionStore.ts database.rules.json
git commit -m "feat: store facilitator notes and takeaways in a private node"
```

---

### Task 3: Export module and participant recap

**Files:**
- Create: `src/lib/exportReport.ts`
- Create: `src/lib/exportReport.test.ts`
- Modify: `src/components/SessionFinished.tsx`

**Interfaces:**
- Consumes: `ClientSessionState`, `CategoryResult` (with `takeaway`) from Task 2.
- Produces (`src/lib/exportReport.ts`):
  - `countColors(votes: Vote[]): Record<VoteColor, number>`
  - `countTrends(votes: Vote[]): Record<VoteTrend, number>`
  - `dominantColor(votes: Vote[]): VoteColor | null` / `dominantTrend(votes: Vote[]): VoteTrend | null` — `null` when there are no votes; ties favour the healthier value.
  - `generateMarkdown(session: ClientSessionState, date?: Date): string`
  - `downloadMarkdown(session: ClientSessionState): void`
  - `downloadPDF(session: ClientSessionState): Promise<void>` (jsPDF loaded lazily)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/exportReport.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CategoryResult, ClientSessionState } from '../types';
import { dominantColor, dominantTrend, generateMarkdown } from './exportReport';

const categories = [
  { name: 'Fun', positiveDescription: 'p', negativeDescription: 'n' },
  { name: 'Learning', nameFr: 'Apprentissage', positiveDescription: 'p', negativeDescription: 'n' },
];

function finished(allResults: CategoryResult[]): ClientSessionState {
  return {
    code: 'ABC234',
    categories,
    participants: [{ id: 'fac', name: 'Alice' }],
    currentCategoryIndex: 1,
    phase: 'finished',
    voteCount: 0,
    totalParticipants: 1,
    hasVoted: false,
    isFacilitator: true,
    myId: 'fac',
    facilitatorId: 'fac',
    currentResults: null,
    allResults,
    facilitatorNotes: {},
    categoryResults: {},
  };
}

const empty = (categoryIndex: number): CategoryResult => ({
  categoryIndex,
  votes: [],
  notes: '',
  takeaway: '',
});

describe('generateMarkdown', () => {
  it('puts the takeaway before the discussion notes', () => {
    const md = generateMarkdown(
      finished([
        {
          categoryIndex: 0,
          votes: [{ color: 'green', trend: 'up' }],
          notes: 'we laughed a lot',
          takeaway: 'keep Friday demos',
        },
        empty(1),
      ]),
    );
    const fun = md.slice(md.indexOf('### 1. Fun'), md.indexOf('### 2. Learning'));
    expect(fun).toContain('**Takeaway:** keep Friday demos');
    expect(fun).toContain('we laughed a lot');
    expect(fun.indexOf('**Takeaway:**')).toBeLessThan(fun.indexOf('**Discussion Notes:**'));
  });

  it('omits takeaway and notes when empty', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).not.toContain('Takeaway');
    expect(md).not.toContain('Discussion Notes');
  });

  it('shows a dash instead of a dominant value for a category without votes', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).toContain('| 2 | Learning | — | — |');
  });
});

describe('dominantColor / dominantTrend', () => {
  it('returns null without votes', () => {
    expect(dominantColor([])).toBeNull();
    expect(dominantTrend([])).toBeNull();
  });

  it('favours the healthier value on ties', () => {
    expect(dominantColor([{ color: 'green', trend: 'down' }, { color: 'red', trend: 'up' }])).toBe('green');
    expect(dominantTrend([{ color: 'green', trend: 'down' }, { color: 'red', trend: 'up' }])).toBe('up');
  });

  it('picks the most voted value', () => {
    const votes = [
      { color: 'orange', trend: 'stable' },
      { color: 'red', trend: 'down' },
      { color: 'red', trend: 'down' },
    ] as const;
    expect(dominantColor([...votes])).toBe('red');
    expect(dominantTrend([...votes])).toBe('down');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/exportReport.test.ts`
Expected: FAIL — cannot resolve `./exportReport`.

- [ ] **Step 3: Create `src/lib/exportReport.ts`**

```ts
import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';

/* ─── Counting helpers ─── */

export function countColors(votes: Vote[]): Record<VoteColor, number> {
  return {
    green: votes.filter((v) => v.color === 'green').length,
    orange: votes.filter((v) => v.color === 'orange').length,
    red: votes.filter((v) => v.color === 'red').length,
  };
}

export function countTrends(votes: Vote[]): Record<VoteTrend, number> {
  return {
    up: votes.filter((v) => v.trend === 'up').length,
    stable: votes.filter((v) => v.trend === 'stable').length,
    down: votes.filter((v) => v.trend === 'down').length,
  };
}

/* ─── Dominant helpers (ties favour the healthier value; null without votes) ─── */

export function dominantColor(votes: Vote[]): VoteColor | null {
  if (!votes.length) return null;
  const c = countColors(votes);
  if (c.green >= c.orange && c.green >= c.red) return 'green';
  if (c.orange >= c.red) return 'orange';
  return 'red';
}

export function dominantTrend(votes: Vote[]): VoteTrend | null {
  if (!votes.length) return null;
  const t = countTrends(votes);
  if (t.up >= t.stable && t.up >= t.down) return 'up';
  if (t.stable >= t.down) return 'stable';
  return 'down';
}

const COLOR_EMOJI: Record<VoteColor, string> = { green: '🟢', orange: '🟠', red: '🔴' };
const TREND_ARROW: Record<VoteTrend, string> = { up: '↗', stable: '→', down: '↘' };

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

/* ─── Markdown generation ─── */

export function generateMarkdown(session: ClientSessionState, date = new Date()): string {
  let md = `# Squad Health Check — ${formatDate(date)}\n\n`;
  md += `**Session Code:** ${session.code}  \n`;
  md += `**Participants:** ${session.participants.length}\n\n`;
  md += `## Results Summary\n\n`;
  md += `| # | Category | Health | Trend | 🟢 | 🟠 | 🔴 | ↗ | → | ↘ |\n`;
  md += `|---|----------|--------|-------|-----|-----|-----|-----|-----|-----|\n`;

  for (const result of session.allResults) {
    const cat = session.categories[result.categoryIndex];
    const cc = countColors(result.votes);
    const tc = countTrends(result.votes);
    const dc = dominantColor(result.votes);
    const dt = dominantTrend(result.votes);
    md += `| ${result.categoryIndex + 1} | ${cat.name} | ${dc ? COLOR_EMOJI[dc] : '—'} | ${dt ? TREND_ARROW[dt] : '—'} | ${cc.green} | ${cc.orange} | ${cc.red} | ${tc.up} | ${tc.stable} | ${tc.down} |\n`;
  }

  md += `\n## Detailed Results\n\n`;

  for (const result of session.allResults) {
    const cat = session.categories[result.categoryIndex];
    const cc = countColors(result.votes);
    const tc = countTrends(result.votes);

    md += `### ${result.categoryIndex + 1}. ${cat.name}`;
    if (cat.nameFr) md += ` (${cat.nameFr})`;
    md += `\n\n`;
    md += `- 🟢 **Green:** ${cat.positiveDescription}\n`;
    md += `- 🔴 **Red:** ${cat.negativeDescription}\n\n`;
    md += `**Votes (${result.votes.length}):** 🟢 ${cc.green} | 🟠 ${cc.orange} | 🔴 ${cc.red}  \n`;
    md += `**Trend:** ↗ ${tc.up} | → ${tc.stable} | ↘ ${tc.down}\n\n`;

    if (result.takeaway) {
      md += `**Takeaway:** ${result.takeaway}\n\n`;
    }
    if (result.notes) {
      md += `**Discussion Notes:**\n\n${result.notes}\n\n`;
    }

    md += `---\n\n`;
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

/** jsPDF is loaded on demand: only the facilitator ever exports. */
export async function downloadPDF(session: ClientSessionState): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();

  /* Title */
  doc.setFontSize(22);
  doc.setTextColor(74, 144, 217);
  doc.text('Squad Health Check', 14, 22);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(formatDate(new Date()), 14, 30);
  doc.setFontSize(10);
  doc.text(
    `Session: ${session.code}  |  Participants: ${session.participants.length}`,
    14,
    36,
  );

  /* Summary table */
  const tableBody = session.allResults.map((r) => {
    const cat = session.categories[r.categoryIndex];
    const cc = countColors(r.votes);
    const tc = countTrends(r.votes);
    return [
      cat.name,
      String(cc.green),
      String(cc.orange),
      String(cc.red),
      String(tc.up),
      String(tc.stable),
      String(tc.down),
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Category', 'Green', 'Orange', 'Red', 'Up', 'Stable', 'Down']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [74, 144, 217], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
  });

  /* Takeaways and notes */
  let y = (doc as any).lastAutoTable.finalY + 12;

  for (const result of session.allResults) {
    if (!result.notes && !result.takeaway) continue;
    const cat = session.categories[result.categoryIndex];

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(cat.name, 14, y);
    y += 6;
    doc.setFontSize(9);

    if (result.takeaway) {
      const lines = doc.splitTextToSize(`Takeaway: ${result.takeaway}`, 180);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 2;
    }

    doc.setFont('helvetica', 'normal');
    if (result.notes) {
      const lines = doc.splitTextToSize(result.notes, 180);
      doc.text(lines, 14, y);
      y += lines.length * 4.5;
    }
    y += 10;
  }

  doc.save(`squad-health-check-${session.code}.pdf`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/exportReport.test.ts`
Expected: PASS.

- [ ] **Step 5: Reduce `SessionFinished` to the vote recap**

Replace the whole of `src/components/SessionFinished.tsx` with:

```tsx
import { Badge, Card, Icon, Table, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import { countColors, countTrends } from '../lib/exportReport';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

interface Props {
  session: ClientSessionState;
}

/** Shared recap: votes only — notes, takeaways and exports live in the facilitator notes window. */
function SessionFinished({ session }: Props) {
  return (
    <div className="page">
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading2}>Session Complete!</Text>
        <Text preset={TEXT_PRESET.paragraph}>
          Here&apos;s the summary of all results from the health check.
        </Text>
      </div>

      <Card className="card-body table-scroll">
        <Table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Category</th>
              {COLOR_OPTIONS.map(({ value, label, badge }) => (
                <th scope="col" key={value}>
                  <Badge color={badge}>{label}</Badge>
                </th>
              ))}
              {TREND_OPTIONS.map(({ value, label, icon }) => (
                <th scope="col" key={value}>
                  <Icon name={icon} aria-label={label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.allResults.map((result) => {
              const cat = session.categories[result.categoryIndex];
              const cc = countColors(result.votes);
              const tc = countTrends(result.votes);
              return (
                <tr key={result.categoryIndex}>
                  <td>{result.categoryIndex + 1}</td>
                  <th scope="row">{cat.name}</th>
                  <td>{cc.green}</td>
                  <td>{cc.orange}</td>
                  <td>{cc.red}</td>
                  <td>{tc.up}</td>
                  <td>{tc.stable}</td>
                  <td>{tc.down}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

export default SessionFinished;
```

(Until Task 4 lands, nobody can download exports — that's expected within this branch.)

- [ ] **Step 6: Verify build and all tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass. `grep -rn "jspdf" src` lists only `src/lib/exportReport.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/exportReport.ts src/lib/exportReport.test.ts src/components/SessionFinished.tsx
git commit -m "feat: move exports to a module and add takeaways"
```

---

### Task 4: Facilitator notes page

**Files:**
- Create: `src/components/SessionStatus.tsx`
- Create: `src/components/VoteSummary.tsx`
- Create: `src/components/NoteFields.tsx`
- Create: `src/pages/FacilitatorNotesPage.tsx`
- Modify: `src/pages/SessionPage.tsx` (use `SessionStatus`)
- Modify: `src/App.tsx` (route)
- Modify: `src/styles/main.css` (summary divider)

**Interfaces:**
- Consumes: `summaryIndexes`, `ClientSessionState.facilitatorNotes` / `categoryResults` / `currentResults` (Task 2); `store.updateFacilitatorNote`, `store.NoteField` (Task 2); `countColors`, `countTrends`, `dominantColor`, `dominantTrend`, `downloadMarkdown`, `downloadPDF` (Task 3).
- Produces:
  - `SessionStatus.tsx`: `Connecting(): JSX.Element`, `SessionNotice({ title: string; backTo: string; backLabel: string }): JSX.Element` (named exports).
  - `VoteSummary` (default export) `({ votes: Vote[] })`.
  - `NoteFields` (default export) `({ note: FacilitatorNote; onChange: (field: NoteField, value: string) => void })`.
  - Route `/session/:code/notes`.

- [ ] **Step 1: Extract shared status components**

Create `src/components/SessionStatus.tsx`:

```tsx
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  Icon,
  ICON_NAME,
  Link,
  Spinner,
  SPINNER_SIZE,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';

export function Connecting() {
  return (
    <div className="stack stack-center loading">
      <Spinner size={SPINNER_SIZE.lg} />
      <Text preset={TEXT_PRESET.paragraph}>Connecting to session…</Text>
    </div>
  );
}

interface NoticeProps {
  title: string;
  backTo: string;
  backLabel: string;
}

export function SessionNotice({ title, backTo, backLabel }: NoticeProps) {
  return (
    <div className="page page-narrow">
      <Card className="card-body stack-center">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        <Link as={RouterLink} to={backTo}>
          <Icon name={ICON_NAME.arrowLeft} />
          {backLabel}
        </Link>
      </Card>
    </div>
  );
}
```

In `src/pages/SessionPage.tsx`:
- delete the local `function Connecting() { … }`;
- add `import { Connecting, SessionNotice } from '../components/SessionStatus';`;
- replace the `if (notFound) { return ( … ); }` block with:

```tsx
  if (notFound) return <SessionNotice title={error} backTo="/" backLabel="Back to home" />;
```

- remove `Spinner`, `SPINNER_SIZE` and `Link` from the ODS import and `Link as RouterLink` from the router import if they are no longer used (`grep -n "Spinner\|<Link\|RouterLink" src/pages/SessionPage.tsx`).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Create `src/components/VoteSummary.tsx`**

```tsx
import { Badge, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import { countColors, countTrends, dominantColor, dominantTrend } from '../lib/exportReport';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';

/** One-line result of a category: dominant colour and trend, then the counts. */
function VoteSummary({ votes }: { votes: Vote[] }) {
  const color = COLOR_OPTIONS.find((o) => o.value === dominantColor(votes));
  const trend = TREND_OPTIONS.find((o) => o.value === dominantTrend(votes));
  if (!color || !trend) return <Text preset={TEXT_PRESET.caption}>No votes</Text>;

  const colors = countColors(votes);
  const trends = countTrends(votes);

  return (
    <div className="inline wrap">
      <Text preset={TEXT_PRESET.label}>Mostly</Text>
      <Badge color={color.badge}>{color.label}</Badge>
      <Text preset={TEXT_PRESET.span}>
        <Icon name={trend.icon} /> {trend.label}
      </Text>
      <Text preset={TEXT_PRESET.caption}>
        {COLOR_OPTIONS.map((o) => `${o.label} ${colors[o.value]}`).join(' · ')}
        {' — '}
        {TREND_OPTIONS.map((o) => `${o.label} ${trends[o.value]}`).join(' · ')}
        {` (${votes.length} vote${votes.length !== 1 ? 's' : ''})`}
      </Text>
    </div>
  );
}

export default VoteSummary;
```

- [ ] **Step 3: Create `src/components/NoteFields.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { FormField, FormFieldLabel, Input, Textarea } from '@ovhcloud/ods-react';
import { FacilitatorNote } from '../types';
import { NoteField } from '../lib/sessionStore';

/**
 * Local copy of a remote value. Remote updates (e.g. from another window) are
 * applied only while the field isn't focused, so the cursor never jumps.
 */
function useSyncedValue(remote: string) {
  const [value, setValue] = useState(remote);
  const focused = useRef(false);
  const latestRemote = useRef(remote);
  latestRemote.current = remote;

  useEffect(() => {
    if (!focused.current) setValue(remote);
  }, [remote]);

  return {
    value,
    setValue,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      setValue(latestRemote.current);
    },
  };
}

interface Props {
  note: FacilitatorNote;
  onChange: (field: NoteField, value: string) => void;
}

function NoteFields({ note, onChange }: Props) {
  const notes = useSyncedValue(note.notes);
  const takeaway = useSyncedValue(note.takeaway);

  return (
    <div className="stack">
      <FormField>
        <FormFieldLabel>Discussion notes</FormFieldLabel>
        <Textarea
          placeholder="Write down key discussion points…"
          value={notes.value}
          onFocus={notes.onFocus}
          onBlur={notes.onBlur}
          onChange={(e) => {
            notes.setValue(e.target.value);
            onChange('notes', e.target.value);
          }}
          rows={5}
          maxLength={5000}
        />
      </FormField>
      <FormField>
        <FormFieldLabel>Takeaway</FormFieldLabel>
        <Input
          placeholder="One-line conclusion…"
          value={takeaway.value}
          onFocus={takeaway.onFocus}
          onBlur={takeaway.onBlur}
          onChange={(e) => {
            takeaway.setValue(e.target.value);
            onChange('takeaway', e.target.value);
          }}
          maxLength={300}
        />
      </FormField>
    </div>
  );
}

export default NoteFields;
```

- [ ] **Step 4: Create `src/pages/FacilitatorNotesPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  BADGE_COLOR,
  type BadgeColor,
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
import { ClientSessionState, FacilitatorNote, SessionPhase } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { CODE_PATTERN } from '../lib/sessionCode';
import { summaryIndexes } from '../lib/deriveClientState';
import { downloadMarkdown, downloadPDF } from '../lib/exportReport';
import * as store from '../lib/sessionStore';
import { Connecting, SessionNotice } from '../components/SessionStatus';
import NoteFields from '../components/NoteFields';
import VoteSummary from '../components/VoteSummary';

const warn = (err: unknown) => console.warn('[notes]', err);

const EMPTY_NOTE: FacilitatorNote = { notes: '', takeaway: '' };

const PHASE_BADGE: Record<SessionPhase, { label: string; color: BadgeColor }> = {
  lobby: { label: 'Lobby', color: BADGE_COLOR.neutral },
  voting: { label: 'Voting', color: BADGE_COLOR.information },
  revealed: { label: 'Revealed', color: BADGE_COLOR.success },
  finished: { label: 'Finished', color: BADGE_COLOR.primary },
};

function FacilitatorNotesView() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [error, setError] = useState('');

  /* Distinct title so this window is easy to leave out of the screen-share picker */
  useEffect(() => {
    const previous = document.title;
    document.title = `Facilitator notes — ${code}`;
    return () => {
      document.title = previous;
    };
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    if (!CODE_PATTERN.test(code)) {
      setError('Session not found');
      return;
    }
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) setError('Session not found');
          return;
        }
        if (!cancelled) setUid(id);
      } catch (err) {
        if (!cancelled) setError(store.describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!uid) return;
    return store.subscribeSession(code, uid, setSession);
  }, [uid, code]);

  const handleChange = useCallback(
    (categoryIndex: number, field: store.NoteField, value: string) => {
      if (session) store.updateFacilitatorNote(session, categoryIndex, field, value).catch(warn);
    },
    [session],
  );

  if (error) return <SessionNotice title={error} backTo="/" backLabel="Back to home" />;
  if (!session) return <Connecting />;
  if (!session.isFacilitator) {
    return (
      <SessionNotice
        title="Only the facilitator can open notes"
        backTo={`/session/${code}`}
        backLabel="Back to the session"
      />
    );
  }

  const { phase, currentCategoryIndex: current, categories } = session;
  const phaseBadge = PHASE_BADGE[phase];
  const noteAt = (i: number) => session.facilitatorNotes[i] ?? EMPTY_NOTE;
  const past = summaryIndexes(session);

  return (
    <div className="page">
      <div className="session-header">
        <Text preset={TEXT_PRESET.heading2} className="grow">
          Facilitator notes
        </Text>
        <Badge color={BADGE_COLOR.neutral}>Code: {code}</Badge>
        <Badge color={phaseBadge.color}>{phaseBadge.label}</Badge>
      </div>

      <Message color={MESSAGE_COLOR.information} dismissible={false}>
        <MessageIcon name={ICON_NAME.circleInfo} />
        <MessageBody>
          Only you can see these notes. Keep this window out of your screen share.
        </MessageBody>
      </Message>

      {(phase === 'voting' || phase === 'revealed') && (
        <Card className="card-body">
          <Text preset={TEXT_PRESET.label}>
            Category {current + 1} of {categories.length}
          </Text>
          <Text preset={TEXT_PRESET.heading3}>{categories[current].name}</Text>
          {phase === 'voting' ? (
            <Text preset={TEXT_PRESET.paragraph}>
              {session.voteCount} / {session.totalParticipants} votes received
            </Text>
          ) : session.currentResults ? (
            <VoteSummary votes={session.currentResults} />
          ) : (
            <Text preset={TEXT_PRESET.caption}>Loading results…</Text>
          )}
          <NoteFields
            key={current}
            note={noteAt(current)}
            onChange={(field, value) => handleChange(current, field, value)}
          />
        </Card>
      )}

      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading3}>Summary</Text>
        {past.length === 0 ? (
          <Text preset={TEXT_PRESET.paragraph}>
            {phase === 'lobby'
              ? "Voting hasn't started yet."
              : 'Categories appear here once you move past them.'}
          </Text>
        ) : (
          past.map((i) => (
            <div key={i} className="stack summary-item">
              <Text preset={TEXT_PRESET.heading5}>
                {i + 1}. {categories[i].name}
              </Text>
              {session.categoryResults[i] ? (
                <VoteSummary votes={session.categoryResults[i]} />
              ) : (
                <Text preset={TEXT_PRESET.caption}>Loading results…</Text>
              )}
              <NoteFields
                note={noteAt(i)}
                onChange={(field, value) => handleChange(i, field, value)}
              />
            </div>
          ))
        )}
      </Card>

      {phase === 'finished' && (
        <div className="actions">
          <Button onClick={() => downloadMarkdown(session)}>
            <Icon name={ICON_NAME.download} />
            Download Markdown
          </Button>
          <Button
            variant={BUTTON_VARIANT.outline}
            onClick={() => downloadPDF(session).catch(warn)}
          >
            <Icon name={ICON_NAME.download} />
            Download PDF
          </Button>
        </div>
      )}
    </div>
  );
}

/* Remount per code so navigating between sessions resets all state */
function FacilitatorNotesPage() {
  const { code = '' } = useParams<{ code: string }>();
  return <FacilitatorNotesView key={code} />;
}

export default FacilitatorNotesPage;
```

- [ ] **Step 5: Add the route and CSS**

In `src/App.tsx`, add the import and the route after the session route:

```tsx
import FacilitatorNotesPage from './pages/FacilitatorNotesPage';
```

```tsx
          <Route path="/session/:code/notes" element={<FacilitatorNotesPage />} />
```

In `src/styles/main.css`, under `/* ─── Feature-specific layout ─── */`, append:

```css
.summary-item + .summary-item {
  border-top: var(--ods-theme-border-width) solid var(--ods-theme-split-border-color);
  padding-top: calc(var(--ods-theme-row-gap) * 2);
}
```

- [ ] **Step 6: Verify build and tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 7: Manual check (dev server)**

Run: `npm run dev`, then in browser A create a session, join, and open `http://localhost:3000/#/session/<CODE>/notes` in a second tab of the same browser.
Expected:
- tab title is "Facilitator notes — <CODE>", info message is shown;
- during voting, typing in "Discussion notes" and "Takeaway" persists across a reload of the notes tab;
- with the notes page open in **two** tabs, typing in one while the other has the same field focused does not move the focused cursor; after blurring, the second tab shows the latest text (Review Focus 4).

- [ ] **Step 8: Commit**

```bash
git add src/components/SessionStatus.tsx src/components/VoteSummary.tsx src/components/NoteFields.tsx src/pages/FacilitatorNotesPage.tsx src/pages/SessionPage.tsx src/App.tsx src/styles/main.css
git commit -m "feat: add private facilitator notes page with per-category summary"
```

---

### Task 5: Open-notes button and docs

**Files:**
- Create: `src/components/OpenNotesButton.tsx`
- Modify: `src/components/Lobby.tsx`
- Modify: `src/components/VotingView.tsx`
- Modify: `src/components/SessionFinished.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: route `/session/:code/notes` (Task 4).
- Produces: `OpenNotesButton` (default export) `({ code: string })`.

- [ ] **Step 1: Create `src/components/OpenNotesButton.tsx`**

```tsx
import { Button, BUTTON_SIZE, BUTTON_VARIANT, Icon, ICON_NAME } from '@ovhcloud/ods-react';

const notesUrl = (code: string) =>
  `${window.location.origin}${window.location.pathname}#/session/${code}/notes`;

/**
 * Opens the private notes in a separate window (re-focused if already open),
 * so the screen-shared window never shows them.
 */
function OpenNotesButton({ code }: { code: string }) {
  const open = () => {
    const win = window.open(notesUrl(code), `shc-notes-${code}`, 'popup,width=720,height=900');
    if (win) win.focus();
    else window.alert('Allow pop-ups for this site to open the facilitator notes.');
  };

  return (
    <Button size={BUTTON_SIZE.sm} variant={BUTTON_VARIANT.outline} onClick={open}>
      <Icon name={ICON_NAME.pen} />
      Facilitator notes
      <Icon name={ICON_NAME.externalLink} />
    </Button>
  );
}

export default OpenNotesButton;
```

- [ ] **Step 2: Place the button in the facilitator's views**

`src/components/Lobby.tsx` — add `import OpenNotesButton from './OpenNotesButton';` and inside the facilitator `<div className="actions">`, after the Start Voting button:

```tsx
            <OpenNotesButton code={session.code} />
```

`src/components/VotingView.tsx` — add `import OpenNotesButton from './OpenNotesButton';` and inside `<div className="session-header">`, after the code `Badge`:

```tsx
        {session.isFacilitator && <OpenNotesButton code={session.code} />}
```

`src/components/SessionFinished.tsx` — add `import OpenNotesButton from './OpenNotesButton';` and, after the recap `</Card>`:

```tsx
      {session.isFacilitator && (
        <div className="stack stack-center">
          <Text preset={TEXT_PRESET.paragraph}>
            Notes, takeaways and downloads are in your facilitator notes.
          </Text>
          <OpenNotesButton code={session.code} />
        </div>
      )}
```

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 3: Update `README.md`**

In **Features**, replace the two lines:

```markdown
- **Discussion notes** — Facilitator can jot down key discussion points per category
- **Recap export** — Download results as **Markdown** or **PDF** at the end
```

with:

```markdown
- **Private facilitator notes** — Notes and a one-line takeaway per category, in a separate window that stays out of the screen share; only the facilitator can read them (enforced by database rules)
- **Recap export** — The facilitator downloads results, takeaways and notes as **Markdown** or **PDF** at the end
```

In **How to Use**, replace `   - Team discusses, facilitator writes notes` with `   - Team discusses; the facilitator writes notes and a takeaway in the **Facilitator notes** window (share the session window, not this one)`, and replace step 4 with:

```markdown
4. At the end, everyone sees the vote recap; the facilitator **downloads the report** (with notes) from the notes window
```

In **Manual test checklist**, replace steps 6 and 8 with:

```markdown
6. A: click **Facilitator notes** → a separate window "Facilitator notes — <CODE>" opens; type notes and a takeaway → B's screen shows no notes. Rules Playground: *read* `/sessions/<CODE>/facilitator`, Authenticated with B's UID → *Denied*.
```

```markdown
8. A: Next Category → the previous category appears in the notes window's summary with its results, even after reloading the notes window. Continue … Finish Session → both see the vote recap without notes; Markdown and PDF downloads (with takeaways and notes) work from A's notes window.
```

and append:

```markdown
10. B: open `…/#/session/<CODE>/notes` → "Only the facilitator can open notes"; B's console shows no `PERMISSION_DENIED` for `facilitator` or `closed`.
```

- [ ] **Step 4: Manual end-to-end check**

Run: `npm run dev`; deploy `database.rules.json` to the Firebase project (README step 5); then follow the README **Manual test checklist** with two browsers, including the new steps 6, 8 and 10 (Review Focus 2 and 5).
Expected: every step behaves as written.

- [ ] **Step 5: Commit**

```bash
git add src/components/OpenNotesButton.tsx src/components/Lobby.tsx src/components/VotingView.tsx src/components/SessionFinished.tsx README.md
git commit -m "feat: open facilitator notes in a separate window from the session"
```

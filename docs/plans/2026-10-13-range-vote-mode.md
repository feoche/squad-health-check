# Range Vote Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the facilitator choose, when creating a session, between **Colors** (today) and **Range** (a 1–9 score plus the trend, picked with the ODS `Range`), with a histogram for results, Range-specific fun facts and exports.

**Architecture:** `state.voteMode` (`'colors' | 'range'`, write-once, absent = `colors`) selects the vote shape. `Vote` becomes the union `ColorVote | RangeVote`; no color exists in a Range session. Results stay typed `Vote[]`; views pick `VoteMatrix` or the new `ScoreHistogram` from `session.voteMode`, and narrow with `colorVotes` / `rangeVotes` / `colorOf`. Rules accept `color`+`trend` or `score`+`trend` depending on the mode.

**Tech Stack:** React 18 + TypeScript, `@ovhcloud/ods-react` 19.7 (`Range`), Firebase Realtime Database + rules, PDFKit, Vitest.

**Spec:** `docs/specs/2026-10-13-range-vote-mode-design.md`

## Global Constraints

- Vote modes: `'colors' | 'range'`; creation-form default `'colors'`; absent in the database → `'colors'`; write-once (rules), never changed by the client after `createSession`.
- A Range vote is `{ score, trend }` with `score` an integer 1–9. **No color anywhere in a Range session** (storage, voting, results, exports, fun facts); thresholds in Range fun facts are plain numbers.
- A Colors vote is `{ color, trend }`, unchanged; Colors sessions and old sessions behave exactly as before (existing tests keep passing unchanged except fixtures gaining `voteMode: 'colors'`).
- Offline votes: `offlineVotes/{idx}/{color}/{trend}` in Colors sessions, `offlineVotes/{idx}/{score}/{trend}` in Range sessions.
- Range ends: the category's `negativeDescription` stands for 1, `positiveDescription` for 9 (generic fallbacks `t.colorFallbacks.red` / `.green` when empty).
- Every new user-facing string exists in `en` and `fr` (`src/lib/i18n.ts`; `fr` is typed by `en`, so a missing key fails the build).
- Accessibility (README › Accessibility, WCAG 2.2 AA, PDF/UA-1): accessible name and text value on the Range, `role="status"`/`aria-live` for messages shown without focus, both languages for hidden strings, PDF text tagged.
- Commits: conventional `feat:` / `fix:` / `docs:` subjects, no Claude references, **no `Co-Authored-By` line**, no `.claude` files. The working tree has the user's unrelated untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml`: never `git add -A`; stage and commit only the paths named in each task (`git commit -m "…" -- <paths>`).
- Run tests with `npm test`, type-check and build with `npm run build`.
- `database.rules.json` is not deployed by CI: publish it and verify the live copy **before** pushing the app (CLAUDE.md; Task 8).

## Review Focus

- **Session created before this change (no `voteMode`)**: behaves as Colors everywhere; old votes carry no `score`. Pinned in Task 2.
- **Range vote read where a color is expected** (a `colorVotes` filter on a Range session, `colorOf` on a score): must yield nothing, never `undefined` rendered or a crash. Pinned in Task 1.
- **Facilitator's offline votes in Range**: add on a bar with a chosen trend, remove from a bar whose offline vote has another trend, reset; counts must stay in the right score bucket and `expandOfflineVotes` must read both key styles. Pinned in Tasks 1–2 and 5.
- **Voter submits without moving the Range** (score never chosen): must show "pick a score" and focus the Range, not submit a default 5 nor 1. Pinned in Task 4's manual checks and by the `ScoreInput` touch logic.
- **Even median (e.g. 4.5) and an empty round**: the histogram marks both neighbouring bars and `VoteSummary` shows "No votes". Pinned in Tasks 1 and 5.
- **Previous session of the other mode imported**: no comparison shown (a Colors median is not comparable with a Range one). Pinned in Task 6.

---

## File Structure

- `src/types.ts` — `VOTE_MODES`, `VoteMode`, `ColorVote`, `RangeVote`, `Vote` union, `Ballot` type, `SessionSettings.voteMode`, `ClientSessionState.voteMode`, `OfflineVoteCounts` keyed by string.
- `src/lib/voteScore.ts` — guards (`isRangeVote`, `isColorVote`, `colorOf`), `colorVotes`, `rangeVotes`, `voteWeight`/`medianScore` for both shapes, `scoreCounts`, `trendCounts`, `cellKey`, `sameCell`, `formatScore`.
- `src/lib/deriveClientState.ts` — `voteMode` default, mode-aware `expandOfflineVotes`, `voteOf` (ballot → vote).
- `src/lib/sessionStore.ts` — `DEFAULT_SESSION_SETTINGS.voteMode`, mode-agnostic `submitVote`, `adjustOfflineVote`.
- `database.rules.json` — `state/voteMode`, votes/ballots/offline shapes per mode.
- `src/pages/CreateSession.tsx`, `src/components/facilitator/ParticipantsPanel.tsx` — setting and read-only display.
- `src/components/ScoreInput.tsx` (new) — the ODS `Range` voting control with the 1/9 wording.
- `src/components/VoteLegend.tsx` (new), `ScaleCards.tsx` (new) — what 1 and 9 mean, instead of `ColorCards`.
- `src/components/VotingPanel.tsx` — mode-aware form; `onSubmitVote(vote: Vote)`.
- `src/components/ScoreHistogram.tsx` (new), `VoteBreakdown.tsx` (new) — Range results; `ResultsGrid`, `VoteSummary`, `MedianBadge`, `NamedVotes`, `PresenterView`, `SessionFinished`, `FinishedNotes`, `PreviousResult`, `FacilitatorView` use them.
- `src/lib/exportReport.ts`, `pdfReport.ts`, `sessionHistory.ts`, `public/session-export.schema.json` — Range summary lines, `voteMode` in the JSON export.
- `src/lib/funStats.ts`, `src/lib/i18n.ts` — Range fun facts and strings.
- `src/styles/main.css` — histogram and score input styles.
- `README.md`, `docs/specs/2026-10-13-range-vote-mode-design.md` — docs.

---

### Task 1: Vote types, scoring helpers, and the Colors-only seam

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/voteScore.ts`
- Test: `src/lib/voteScore.test.ts`
- Modify (compile fixes): `src/lib/deriveClientState.ts`, `src/lib/sessionStore.ts`, `src/lib/funStats.ts`, `src/components/VoteMatrix.tsx`, `src/components/ResultsGrid.tsx`, `src/components/SessionFinished.tsx`, `src/components/NamedVotes.tsx`

**Interfaces:**
- Produces (`src/types.ts`):
  ```ts
  export const VOTE_MODES = ['colors', 'range'] as const;
  export type VoteMode = (typeof VOTE_MODES)[number];
  export interface ColorVote { color: VoteColor; trend: VoteTrend }
  export interface RangeVote { score: number; trend: VoteTrend }
  export type Vote = ColorVote | RangeVote;
  export type Ballot = Vote & { key: string };
  export type OfflineVoteCounts = Partial<Record<string, Partial<Record<VoteTrend, number>>>>;
  ```
- Produces (`src/lib/voteScore.ts`): `MIN_SCORE = 1`, `MAX_SCORE = 9`, `isRangeVote(v): v is RangeVote`, `isColorVote(v): v is ColorVote`, `colorOf(v): VoteColor | undefined`, `colorVotes(votes: Vote[]): ColorVote[]`, `rangeVotes(votes: Vote[]): RangeVote[]`, `voteWeight(v: Vote): number`, `medianScore(votes: Vote[]): number | null`, `scoreCell` (unchanged), `scoreCounts(votes: RangeVote[]): number[]` (index `score - 1`, length 9), `trendCounts(votes: Vote[]): Record<VoteTrend, number>`, `cellKey(v: Vote): string` (`"red/down"` or `"7/up"`), `sameCell(a, b): boolean`, `formatScore(score: number): string`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/voteScore.test.ts` (add the new imports to the existing import line: `colorOf, colorVotes, cellKey, formatScore, isColorVote, isRangeVote, rangeVotes, sameCell, scoreCounts, trendCounts`):

```ts
const range = (score: number, trend: VoteTrend = 'stable'): Vote => ({ score, trend });

describe('range votes', () => {
  it('weighs a range vote by its score', () => {
    expect(voteWeight(range(1))).toBe(1);
    expect(voteWeight(range(7, 'up'))).toBe(7);
  });

  it('takes the median of the scores, a half with an even count', () => {
    expect(medianScore([range(2), range(9), range(4)])).toBe(4);
    expect(medianScore([range(4), range(5)])).toBe(4.5);
    expect(medianScore([])).toBeNull();
  });

  it('tells the two vote shapes apart and never invents a color', () => {
    expect(isRangeVote(range(3))).toBe(true);
    expect(isColorVote(range(3))).toBe(false);
    expect(colorOf(range(3))).toBeUndefined();
    expect(colorOf(vote('red', 'down'))).toBe('red');
    expect(colorVotes([range(3), vote('red', 'down')])).toEqual([vote('red', 'down')]);
    expect(rangeVotes([range(3), vote('red', 'down')])).toEqual([range(3)]);
  });

  it('counts the votes of each score from 1 to 9', () => {
    expect(scoreCounts([range(1), range(9), range(9)] as { score: number; trend: VoteTrend }[])).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0, 2,
    ]);
  });

  it('counts the votes of each trend', () => {
    expect(trendCounts([range(1, 'up'), vote('red', 'up'), range(5, 'down')])).toEqual({ up: 2, stable: 0, down: 1 });
  });

  it('names a vote cell and compares cells within a shape', () => {
    expect(cellKey(range(7, 'up'))).toBe('7/up');
    expect(cellKey(vote('red', 'down'))).toBe('red/down');
    expect(sameCell(range(7, 'up'), range(7, 'up'))).toBe(true);
    expect(sameCell(range(7, 'up'), range(7, 'down'))).toBe(false);
    expect(sameCell(range(7, 'up'), vote('green', 'up'))).toBe(false);
  });

  it('writes a half score with its decimal', () => {
    expect(formatScore(6)).toBe('6');
    expect(formatScore(5.5)).toBe('5.5');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/voteScore.test.ts`
Expected: FAIL (the new exports are missing).

- [ ] **Step 3: Implement the types**

In `src/types.ts`:

1. After `export type VoteTrend = …;` add:
   ```ts
   /** How people vote, chosen when creating the session: a health color, or a score from 1 to 9 */
   export const VOTE_MODES = ['colors', 'range'] as const;
   export type VoteMode = (typeof VOTE_MODES)[number];
   ```
2. In `SessionSettings`, add `voteMode: VoteMode;` after `anonymity: Anonymity;`.
3. Replace the `Vote` and `Ballot` declarations with:
   ```ts
   export interface ColorVote {
     color: VoteColor;
     trend: VoteTrend;
   }

   /** A score from 1 (lowest) to 9 (highest); never carries a color */
   export interface RangeVote {
     score: number;
     trend: VoteTrend;
   }

   /** The shape follows the session's `voteMode`: ColorVote in 'colors', RangeVote in 'range' */
   export type Vote = ColorVote | RangeVote;

   /** A voter's private copy of their vote, which lets them edit it while the round is open */
   export type Ballot = Vote & {
     /** Key of the anonymous vote under votes/{index} */
     key: string;
   };
   ```
   (delete the old `interface Ballot extends Vote`).
4. Replace `OfflineVoteCounts` with:
   ```ts
   /** Votes the facilitator added for people present but not connected, counted per cell: by color in 'colors' sessions, by score ("1"…"9") in 'range' ones */
   export type OfflineVoteCounts = Partial<Record<string, Partial<Record<VoteTrend, number>>>>;
   ```
5. In `ClientSessionState`, add after the `anonymity` field:
   ```ts
   /** Absent in the database means 'colors' (sessions created before the setting existed) */
   voteMode: VoteMode;
   ```

- [ ] **Step 4: Implement the helpers**

Replace `src/lib/voteScore.ts` with:

```ts
import { ColorVote, RangeVote, Vote, VoteColor, VoteTrend } from '../types';

/* ─── Vote weights: 1 to 9. Colors mode: red getting worse = 1 … green improving = 9, colour outweighs trend. Range mode: the score itself. ─── */

export const MIN_SCORE = 1;
export const MAX_SCORE = 9;

const COLORS_WORST_FIRST: VoteColor[] = ['red', 'orange', 'green'];
const TRENDS_WORST_FIRST: VoteTrend[] = ['down', 'stable', 'up'];

export const isRangeVote = (vote: Vote): vote is RangeVote => 'score' in vote;
export const isColorVote = (vote: Vote): vote is ColorVote => 'color' in vote;

/** The color of a Colors-mode vote; a Range vote has none */
export const colorOf = (vote: Vote): VoteColor | undefined => (isColorVote(vote) ? vote.color : undefined);

export const colorVotes = (votes: Vote[]): ColorVote[] => votes.filter(isColorVote);
export const rangeVotes = (votes: Vote[]): RangeVote[] => votes.filter(isRangeVote);

export function voteWeight(vote: Vote): number {
  if (isRangeVote(vote)) return vote.score;
  return COLORS_WORST_FIRST.indexOf(vote.color) * 3 + TRENDS_WORST_FIRST.indexOf(vote.trend) + 1;
}

/** Median weight of the votes, possibly a half with an even count; null without votes */
export function medianScore(votes: Vote[]): number | null {
  if (!votes.length) return null;
  const weights = votes.map(voteWeight).sort((a, b) => a - b);
  const mid = Math.floor(weights.length / 2);
  return weights.length % 2 ? weights[mid] : (weights[mid - 1] + weights[mid]) / 2;
}

/** Colour and trend of a score (Colors mode); a half rounds up to the healthier cell */
export function scoreCell(score: number): ColorVote {
  const index = Math.ceil(score) - 1;
  return { color: COLORS_WORST_FIRST[Math.floor(index / 3)], trend: TRENDS_WORST_FIRST[index % 3] };
}

/** Votes per score, at index `score - 1` (so nine entries) */
export function scoreCounts(votes: RangeVote[]): number[] {
  const counts = Array.from({ length: MAX_SCORE }, () => 0);
  for (const { score } of votes) counts[score - MIN_SCORE]++;
  return counts;
}

export function trendCounts(votes: Vote[]): Record<VoteTrend, number> {
  const counts: Record<VoteTrend, number> = { up: 0, stable: 0, down: 0 };
  for (const { trend } of votes) counts[trend]++;
  return counts;
}

/** The results cell of a vote: "red/down" in Colors sessions, "7/up" in Range ones */
export const cellKey = (vote: Vote): string => `${isRangeVote(vote) ? vote.score : vote.color}/${vote.trend}`;

export const sameCell = (a: Vote, b: Vote): boolean => cellKey(a) === cellKey(b);

/** A score as read by people: a whole number, or with its half */
export const formatScore = (score: number): string => String(score);
```

Note `sameCell` compares keys, so a score never equals a color cell.

- [ ] **Step 5: Run the new tests**

Run: `npm test -- src/lib/voteScore.test.ts`
Expected: PASS (existing and new).

- [ ] **Step 6: Fix what the union breaks, Colors behaviour unchanged**

Run `npm run build` and fix each error with the edits below (an error elsewhere that is not listed: narrow with `colorVotes` / `colorOf`, never cast).

`src/lib/deriveClientState.ts`:
- Add `RangeVote`-free helper under `votesAt`:
  ```ts
  /** The vote of a ballot, without its key */
  function voteOf(ballot: Ballot): Vote {
    return isRangeVote(ballot)
      ? { score: ballot.score, trend: ballot.trend }
      : { color: ballot.color, trend: ballot.trend };
  }
  ```
  and `import { isRangeVote } from './voteScore';`.
- `myVote`: `return ballot ? voteOf(ballot) : null;`
- In `namedVotes`: `vote: voteOf(b),` instead of `vote: { color: b.color, trend: b.trend },`.

`src/lib/sessionStore.ts`:
- Replace the body of `adjustOfflineVote` after the phase guard with:
  ```ts
  const idx = s.currentCategoryIndex;
  if (delta < 0 && !s.offlineVotes[idx]?.some((v) => sameCell(v, vote))) return;
  const bucket = isRangeVote(vote) ? vote.score : vote.color;
  await set(sessionRef(s.code, `offlineVotes/${idx}/${bucket}/${vote.trend}`), increment(delta));
  ```
  with `import { isRangeVote, sameCell } from './voteScore';`.
- In `submitVote`, delete `const { color, trend } = vote;` and write `vote` / `{ key, ...vote }`:
  ```ts
  await update(sessionRef(s.code), {
    [`votes/${idx}/${key}`]: vote,
    [`ballots/${idx}/${s.myId}`]: { key, ...vote },
  });
  ```
  in the edit branch (key from the ballot) and
  ```ts
  await update(sessionRef(s.code), {
    [`voters/${idx}/${s.myId}`]: serverTimestamp(),
    [`votes/${idx}/${key}`]: vote,
    [`ballots/${idx}/${s.myId}`]: { key, ...vote },
  });
  ```
  in the first-vote branch.

`src/lib/funStats.ts`:
- `import { colorOf, medianScore, voteWeight } from './voteScore';`
- Run `sed -i "s/v\.color ===/colorOf(v) ===/g" src/lib/funStats.ts` and check with `grep -n "v\.color\|\.color\b" src/lib/funStats.ts` that only `colorOf(v) ===` remains.
- In `peopleOf`, replace `p.colors[v.color]++;` with `const color = colorOf(v);\n      if (color) p.colors[color]++;`.

`src/components/VoteMatrix.tsx`: `import { ColorVote, VoteColor, VoteTrend } from '../types';`, replace `Vote` by `ColorVote` in `Props.votes`, `Props.offlineVotes`, `Props.onAdjust` (`(vote: ColorVote, delta: 1 | -1) => void`) and in `countOf`.

`src/components/ResultsGrid.tsx`: `import { colorVotes } from '../lib/voteScore';` and render
`<VoteMatrix votes={colorVotes(votes)} offlineVotes={colorVotes(offlineVotes ?? [])} onAdjust={onAdjust} />`.

`src/components/SessionFinished.tsx`: `<VoteMatrix votes={colorVotes(result.votes)} compact />` with the import.

`src/components/NamedVotes.tsx`: `const color = COLOR_OPTIONS.find((o) => o.value === colorOf(vote))!;` with `import { colorOf } from '../lib/voteScore';` (Range rendering comes in Task 5).

- [ ] **Step 7: Build and run the whole suite**

Run: `npm run build && npm test`
Expected: both pass. `ClientSessionState` now requires `voteMode`: add `voteMode: 'colors',` after `anonymity: 'full',` in the fixtures of `src/lib/exportReport.test.ts`, `src/lib/pdfReport.test.ts` and the `deriveClientState` expectations that build a full state, and in `deriveClientState` return add `voteMode: 'colors',` temporarily after `anonymity,` (Task 2 replaces it with the real value).

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/lib/voteScore.ts src/lib/voteScore.test.ts src/lib/deriveClientState.ts src/lib/sessionStore.ts src/lib/funStats.ts src/lib/exportReport.test.ts src/lib/pdfReport.test.ts src/components/VoteMatrix.tsx src/components/ResultsGrid.tsx src/components/SessionFinished.tsx src/components/NamedVotes.tsx
git commit -m "feat: split votes into color and range shapes" -- src/types.ts src/lib/voteScore.ts src/lib/voteScore.test.ts src/lib/deriveClientState.ts src/lib/sessionStore.ts src/lib/funStats.ts src/lib/exportReport.test.ts src/lib/pdfReport.test.ts src/components/VoteMatrix.tsx src/components/ResultsGrid.tsx src/components/SessionFinished.tsx src/components/NamedVotes.tsx
```

---

### Task 2: Vote mode in the session state and the database rules

**Files:**
- Modify: `src/lib/deriveClientState.ts`, `src/lib/sessionStore.ts`
- Modify: `database.rules.json`
- Test: `src/lib/deriveClientState.test.ts`

**Interfaces:**
- Consumes: `VoteMode`, `Vote`, `isRangeVote` (Task 1).
- Produces: `SessionStateNode.voteMode?: VoteMode`; `expandOfflineVotes(counts, mode: VoteMode = 'colors'): Vote[]`; `ClientSessionState.voteMode` read from the state; `DEFAULT_SESSION_SETTINGS.voteMode = 'colors'`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/deriveClientState.test.ts` (it already imports `deriveClientState`, `RawSession`, and defines `raw()` and `categories`; add `expandOfflineVotes` to the import list from `./deriveClientState`):

```ts
describe('range sessions', () => {
  const k1 = 'a'.repeat(20);
  const k2 = 'b'.repeat(20);
  const rangeState = (extra: Partial<RawSession['state'] & object> = {}) => ({
    phase: 'revealed' as const,
    currentCategoryIndex: 0,
    voteMode: 'range' as const,
    ...extra,
  });

  it('counts a session without voteMode as colors', () => {
    expect(deriveClientState('ABC234', raw(), 'fac')!.voteMode).toBe('colors');
  });

  it('reads score votes and the facilitator\'s offline scores, in score order', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: rangeState(),
        votes: { 0: { [k1]: { score: 8, trend: 'up' }, [k2]: { score: 2, trend: 'down' } } },
        offlineVotes: { 0: { '7': { up: 2 }, '3': { down: 1 } } },
      }),
      'fac',
    )!;
    expect(s.voteMode).toBe('range');
    expect(s.currentResults).toEqual([
      { score: 8, trend: 'up' },
      { score: 2, trend: 'down' },
      { score: 3, trend: 'down' },
      { score: 7, trend: 'up' },
      { score: 7, trend: 'up' },
    ]);
    expect(s.offlineVotes[0]).toEqual([
      { score: 3, trend: 'down' },
      { score: 7, trend: 'up' },
      { score: 7, trend: 'up' },
    ]);
  });

  it('returns the voter\'s own score without the ballot key', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'voting', currentCategoryIndex: 0, voteMode: 'range' },
        ballots: { '0': { key: k1, score: 6, trend: 'down' } },
      }),
      'bob',
    )!;
    expect(s.myVote).toEqual({ score: 6, trend: 'down' });
  });

  it('names score votes when votes are not anonymous', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: rangeState({ anonymity: 'off' }),
        roundBallots: { '0': { bob: { key: k1, score: 4, trend: 'stable' } } },
      }),
      'fac',
    )!;
    expect(s.namedVotes[0]).toEqual([{ id: 'bob', name: 'Bob', vote: { score: 4, trend: 'stable' } }]);
  });
});

describe('expandOfflineVotes', () => {
  it('reads color keys by default and score keys in range mode', () => {
    expect(expandOfflineVotes({ red: { down: 1 } })).toEqual([{ color: 'red', trend: 'down' }]);
    expect(expandOfflineVotes({ '9': { up: 1 } }, 'range')).toEqual([{ score: 9, trend: 'up' }]);
    expect(expandOfflineVotes(null, 'range')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/lib/deriveClientState.test.ts`
Expected: FAIL (`voteMode` is hardcoded `'colors'`, offline keys read as colors).

- [ ] **Step 3: Implement the state**

In `src/lib/deriveClientState.ts`:

- Imports: add `VoteMode` to the `../types` import.
- `SessionStateNode` gains, after `anonymity?`:
  ```ts
  /** Absent in sessions created before the setting existed: counts as 'colors' */
  voteMode?: VoteMode;
  ```
- Replace `expandOfflineVotes` and `votesAt` with:
  ```ts
  /** One vote per unit of each cell's count; the cell key is a color in 'colors' sessions, a score in 'range' ones */
  export function expandOfflineVotes(counts: OfflineVoteCounts | null | undefined, mode: VoteMode = 'colors'): Vote[] {
    return Object.entries(counts ?? {}).flatMap(([key, trends]) =>
      Object.entries(trends ?? {}).flatMap(([trend, n]) =>
        Array.from(
          { length: n ?? 0 },
          () => (mode === 'range' ? { score: Number(key), trend } : { color: key, trend }) as Vote,
        ),
      ),
    );
  }

  /** Participants' votes, then the ones the facilitator added for people without the app */
  function votesAt(raw: RawSession, idx: number, mode: VoteMode): Vote[] {
    return [
      ...Object.values(at(raw.votes, idx) ?? {}),
      ...expandOfflineVotes(raw.offlineVotes[String(idx)], mode),
    ];
  }
  ```
- In `deriveClientState`, after `const { phase, currentCategoryIndex } = raw.state;` add `const voteMode: VoteMode = raw.state.voteMode ?? 'colors';` and pass `voteMode` to every `votesAt(raw, …)` call (four call sites: `categoryResults`, `allResults`, `currentResults`, `liveResults`) and to `expandOfflineVotes(counts, voteMode)` in the `offlineVotes` loop.
- Replace the temporary `voteMode: 'colors',` in the returned object with `voteMode,`.

In `src/lib/sessionStore.ts`: `DEFAULT_SESSION_SETTINGS` gains `voteMode: 'colors',` after `anonymity: 'off',`.

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Update the rules**

Edit `database.rules.json` (each line stays a single JSON string). Let `MODE` = `root.child('sessions/' + $code + '/state/voteMode').val() === 'range'`.

1. `state` → `.validate`: replace
   `... && newData.child('facilitatorVotes').val() === data.child('facilitatorVotes').val()))`
   with
   `... && newData.child('facilitatorVotes').val() === data.child('facilitatorVotes').val() && newData.child('voteMode').val() === data.child('voteMode').val()))`.
2. After the `"anonymity"` line in `state`, add:
   `"voteMode": { ".validate": "newData.val() === 'colors' || newData.val() === 'range'" },`
3. `votes/$idx/$key` → `.validate`: replace `"$key.length === 20 && newData.hasChildren(['color', 'trend'])"` with
   `"$key.length === 20 && newData.hasChild('trend') && (root.child('sessions/' + $code + '/state/voteMode').val() === 'range' ? (newData.hasChild('score') && !newData.hasChild('color')) : (newData.hasChild('color') && !newData.hasChild('score')))"`
   and add, after the existing `"color"` line of that node:
   `"score": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 9 && newData.val() % 1 === 0" },`
4. `ballots/$idx/$uid` → `.validate`: replace `"newData.hasChildren(['key', 'color', 'trend'])"` with
   `"newData.hasChildren(['key', 'trend']) && (root.child('sessions/' + $code + '/state/voteMode').val() === 'range' ? (newData.hasChild('score') && !newData.hasChild('color')) : (newData.hasChild('color') && !newData.hasChild('score')))"`
   and add the same `"score"` line after its `"color"` line.
5. `offlineVotes/$idx`: rename `"$color"` to `"$bucket"` and replace its `.validate` with
   `"root.child('sessions/' + $code + '/state/voteMode').val() === 'range' ? $bucket.matches(/^[1-9]$/) : ($bucket === 'green' || $bucket === 'orange' || $bucket === 'red')"`
   (the nested `"$trend"` rule is unchanged).

Verify the file parses and the edits are in:

Run: `node -e "const r=JSON.parse(require('fs').readFileSync('database.rules.json','utf8')).rules.sessions.\$code; console.log(Object.keys(r.state), Object.keys(r.offlineVotes['\$idx']))"`
Expected: the `state` keys include `voteMode`; the offline keys include `$bucket`.

- [ ] **Step 6: Commit** (rules are published in Task 8, before the app is pushed)

```bash
git commit -m "feat: add the vote mode to the session state and rules" -- src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts src/lib/sessionStore.ts database.rules.json
```

---

### Task 3: Vote mode on the creation form and in the lobby

**Files:**
- Modify: `src/lib/i18n.ts` (`settings`), `src/pages/CreateSession.tsx`, `src/components/facilitator/ParticipantsPanel.tsx`
- Test: `src/lib/i18n.test.ts` (existing: keep passing)

**Interfaces:**
- Consumes: `VOTE_MODES`, `VoteMode`, `DEFAULT_SESSION_SETTINGS.voteMode`.
- Produces: `t.settings.voteMode`, `t.settings.voteModes`, `t.settings.voteModeHints`.

- [ ] **Step 1: Add the strings**

In `src/lib/i18n.ts`, inside `settings` of `en` (after `levelHints`):

```ts
    voteMode: 'Vote mode',
    voteModes: { colors: 'Colors', range: 'Range (1 to 9)' },
    voteModeHints: {
      colors: 'Everyone picks a health colour (green, orange or red) and a trend.',
      range: 'Everyone picks a score from 1 to 9 and a trend.',
    },
```

and in `fr`:

```ts
    voteMode: 'Mode de vote',
    voteModes: { colors: 'Couleurs', range: 'Échelle (1 à 9)' },
    voteModeHints: {
      colors: 'Chacun choisit une couleur de santé (vert, orange ou rouge) et une tendance.',
      range: 'Chacun choisit une note de 1 à 9 et une tendance.',
    },
```

- [ ] **Step 2: Add the setting to the form**

In `src/pages/CreateSession.tsx`: import `VOTE_MODES, VoteMode` from `../types`. In the settings card, before the anonymity `FormField`, add:

```tsx
          <FormField>
            <FormFieldLabel>{t.settings.voteMode}</FormFieldLabel>
            <RadioGroup
              className="create-session__levels"
              value={settings.voteMode}
              onValueChange={({ value }) => setSettings((s) => ({ ...s, voteMode: value as VoteMode }))}
            >
              {VOTE_MODES.map((mode) => (
                <Radio key={mode} className="create-session__level" value={mode}>
                  <div className="create-session__level-body">
                    <RadioControl />
                    <RadioLabel>{t.settings.voteModes[mode]}</RadioLabel>
                    <Text preset={TEXT_PRESET.caption} className="create-session__level-hint">
                      {t.settings.voteModeHints[mode]}
                    </Text>
                  </div>
                </Radio>
              ))}
            </RadioGroup>
          </FormField>
```

(`createSession` already spreads `settings` into `state`, so `voteMode` is written once at creation.)

- [ ] **Step 3: Show it in the lobby**

In `src/components/facilitator/ParticipantsPanel.tsx`, after the anonymity text add:

```tsx
        {' · '}
        {t.settings.voteMode}: {t.settings.voteModes[session.voteMode]}
```

- [ ] **Step 4: Build and test**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: choose the vote mode when creating a session" -- src/lib/i18n.ts src/pages/CreateSession.tsx src/components/facilitator/ParticipantsPanel.tsx
```

---

### Task 4: Voting with the ODS Range

**Files:**
- Create: `src/components/ScoreInput.tsx`, `src/components/ScaleCards.tsx`, `src/components/VoteLegend.tsx`
- Modify: `src/components/voteOptions.ts`, `src/components/VotingPanel.tsx`, `src/components/IntroContent.tsx`, `src/components/ParticipantView.tsx`, `src/components/PresenterView.tsx`, `src/components/facilitator/CurrentCategory.tsx`, `src/components/facilitator/FacilitatorView.tsx`, `src/pages/SessionPage.tsx`, `src/lib/i18n.ts`, `src/styles/main.css`

**Interfaces:**
- Consumes: `Vote`, `VoteMode`, `MIN_SCORE`, `MAX_SCORE`, `isRangeVote`.
- Produces: `scoreEnds(category?: Category): { low: string; high: string }` (voteOptions); `<ScoreInput category score invalid onChange />`; `<VoteLegend mode category large />`; `VotingPanel` props `{ category; voteMode; onSubmitVote(vote: Vote); initialVote?; onCancel? }`.

- [ ] **Step 1: Add the strings**

`en` (`voting` block):
```ts
    score: 'Score',
    scoreLabel: 'Health score from 1 to 9',
    pickScore: 'Pick a score from 1 to 9.',
    scoreNone: 'Move the slider to pick a score',
    scoreValue: (n: number) => `${n} out of 9`,
    scaleLow: 'Score 1',
    scaleHigh: 'Score 9',
```
`en` `intro` block: add `scaleTitle: 'Health scale', whatRange: 'A quick look at how the squad is doing. For each category, everyone picks a score from 1 to 9 and a trend, then we discuss the results together.', scaleHint: 'Score 1 is the lowest, 9 the highest.',`.

`fr` (`voting`): `score: 'Note', scoreLabel: 'Note de santé de 1 à 9', pickScore: 'Choisissez une note de 1 à 9.', scoreNone: 'Déplacez le curseur pour choisir une note', scoreValue: (n) => \`${n} sur 9\`, scaleLow: 'Note 1', scaleHigh: 'Note 9',`
`fr` `intro`: `scaleTitle: 'Échelle de santé', whatRange: "Un rapide tour de l'état de la squad. Pour chaque catégorie, chacun choisit une note de 1 à 9 et une tendance, puis nous discutons ensemble des résultats.", scaleHint: 'La note 1 est la plus basse, 9 la plus haute.',`

- [ ] **Step 2: The 1/9 wording**

Append to `src/components/voteOptions.ts` (add `import { MAX_SCORE, MIN_SCORE } from '../lib/voteScore';` is not needed here):

```ts
/** What 1 and 9 mean in a category: its negative and positive descriptions, or generic ones without a category */
export function scoreEnds(category?: Category): { low: string; high: string } {
  const localized = category && localizeCategory(category);
  return {
    low: localized?.negativeDescription?.trim() || t.colorFallbacks.red,
    high: localized?.positiveDescription?.trim() || t.colorFallbacks.green,
  };
}
```

- [ ] **Step 3: `ScoreInput`**

Create `src/components/ScoreInput.tsx`:

```tsx
import { Range, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category } from '../types';
import { MAX_SCORE, MIN_SCORE } from '../lib/voteScore';
import { t } from '../lib/i18n';
import { scoreEnds } from './voteOptions';

interface Props {
  category: Category;
  /** Null until the voter touches the slider: the thumb then waits in the middle without being a vote */
  score: number | null;
  invalid: boolean;
  onChange: (score: number) => void;
}

const WAITING = Math.round((MIN_SCORE + MAX_SCORE) / 2);
const TICKS = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i);
const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * The score picker: an ODS Range from 1 to 9, the 1 and 9 worded by the category.
 * A Range always shows a thumb, so touching it (pointer or arrow keys) is what counts as picking:
 * the capture handlers record the waiting value first, then the Range's own change replaces it.
 */
function ScoreInput({ category, score, invalid, onChange }: Props) {
  const { low, high } = scoreEnds(category);
  const touch = () => {
    if (score === null) onChange(WAITING);
  };

  return (
    <div
      className="score-input"
      onPointerDownCapture={touch}
      onKeyDownCapture={(e) => MOVE_KEYS.has(e.key) && touch()}
    >
      <div className="score-input__ends">
        <div className="score-input__end">
          <Text preset={TEXT_PRESET.label} as="span">{t.voting.scaleLow}</Text>
          <Text preset={TEXT_PRESET.paragraph} className="score-input__description">{low}</Text>
        </div>
        <div className="score-input__end score-input__end--high">
          <Text preset={TEXT_PRESET.label} as="span">{t.voting.scaleHigh}</Text>
          <Text preset={TEXT_PRESET.paragraph} className="score-input__description">{high}</Text>
        </div>
      </div>
      <Range
        aria-label={[t.voting.scoreLabel]}
        min={MIN_SCORE}
        max={MAX_SCORE}
        step={1}
        ticks={TICKS}
        displayBounds
        invalid={invalid}
        value={[score ?? WAITING]}
        onDragging={({ value }) => onChange(value[0])}
        onValueChange={({ value }) => onChange(value[0])}
      />
      <Text preset={TEXT_PRESET.heading4} as="output" className="score-input__value" role="status">
        {score === null ? t.voting.scoreNone : t.voting.scoreValue(score)}
      </Text>
    </div>
  );
}

export default ScoreInput;
```

- [ ] **Step 4: `VotingPanel` per mode**

Edit `src/components/VotingPanel.tsx`:

- Imports: `import { Category, Vote, VoteColor, VoteMode, VoteTrend } from '../types';`, `import ScoreInput from './ScoreInput';`, `import { isRangeVote } from '../lib/voteScore';`.
- Props: `voteMode: VoteMode;` and `onSubmitVote: (vote: Vote) => void;`.
- State: replace the `selectedColor` initial value and add the score:
  ```tsx
  const range = voteMode === 'range';
  const [selectedColor, setSelectedColor] = useState<VoteColor | null>(
    initialVote && !isRangeVote(initialVote) ? initialVote.color : null,
  );
  const [selectedScore, setSelectedScore] = useState<number | null>(
    initialVote && isRangeVote(initialVote) ? initialVote.score : null,
  );
  ```
- `handleSubmit`:
  ```tsx
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (selectedTrend) {
      if (range && selectedScore !== null) return onSubmitVote({ score: selectedScore, trend: selectedTrend });
      if (!range && selectedColor) return onSubmitVote({ color: selectedColor, trend: selectedTrend });
    }
    // Take the voter to the first question left unanswered, where its error is read out
    const firstMissing = (range ? selectedScore === null : !selectedColor) ? 'main' : 'trend';
    const selector =
      firstMissing === 'trend'
        ? '.voting-panel__field--trend input:not(:disabled)'
        : range
          ? '.voting-panel__field--score [role="slider"]'
          : '.voting-panel__field--color input:not(:disabled)';
    form.current?.querySelector<HTMLElement>(selector)?.focus();
  };
  ```
- `const colorMissing = submitted && !range && !selectedColor;` and add `const scoreMissing = submitted && range && selectedScore === null;`.
- Render the colors `FormField` only when `!range` (`{!range && (<FormField … color … />)}`), and add before the trend field:
  ```tsx
      {range && (
        <FormField className="voting-panel__field voting-panel__field--score" invalid={scoreMissing}>
          <FormFieldLabel className="voting-panel__field-label">{t.voting.score}</FormFieldLabel>
          <ScoreInput category={category} score={selectedScore} invalid={scoreMissing} onChange={setSelectedScore} />
          <FormFieldError>{t.voting.pickScore}</FormFieldError>
        </FormField>
      )}
  ```

- [ ] **Step 5: Legend instead of the color cards**

Create `src/components/ScaleCards.tsx`:

```tsx
import { Card, CARD_COLOR, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category } from '../types';
import { MAX_SCORE, MIN_SCORE } from '../lib/voteScore';
import { t } from '../lib/i18n';
import { scoreEnds } from './voteOptions';

/** What the two ends of the 1–9 scale mean, for a category or, without one, in general terms. `large` for the shared screen. */
function ScaleCards({ category, large = false }: { category?: Category; large?: boolean }) {
  const { low, high } = scoreEnds(category);
  return (
    <div className={large ? 'grid-2 scale-cards scale-cards--large' : 'grid-2 scale-cards'}>
      {[
        { score: MIN_SCORE, text: low },
        { score: MAX_SCORE, text: high },
      ].map(({ score, text }) => (
        <Card key={score} className="card-body card-compact scale-cards__card" color={CARD_COLOR.neutral}>
          <Text preset={large ? TEXT_PRESET.heading2 : TEXT_PRESET.heading4} as="span" className="scale-cards__score">
            {score}
          </Text>
          <Text preset={TEXT_PRESET.paragraph}>{text}</Text>
        </Card>
      ))}
    </div>
  );
}

export default ScaleCards;
```

If `grid-2` does not exist in `src/styles/main.css` (check with `grep -n "\.grid-3" src/styles/main.css`), add next to `.grid-3`:
```css
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: calc(var(--ods-theme-column-gap) * 2);
}
```

Create `src/components/VoteLegend.tsx`:

```tsx
import { Category, VoteMode } from '../types';
import ColorCards from './ColorCards';
import ScaleCards from './ScaleCards';

/** What the votes mean: the three health colours, or the two ends of the 1–9 scale */
function VoteLegend({ mode, category, large = false }: { mode: VoteMode; category?: Category; large?: boolean }) {
  return mode === 'range' ? (
    <ScaleCards category={category} large={large} />
  ) : (
    <ColorCards category={category} large={large} />
  );
}

export default VoteLegend;
```

- [ ] **Step 6: Wire the views**

- `IntroContent.tsx`: add prop `voteMode: VoteMode`; use `<Text …>{voteMode === 'range' ? t.intro.whatRange : t.intro.what}</Text>` (non-compact branch); replace the colors heading and cards with
  ```tsx
  <Text preset={TEXT_PRESET.heading3}>{voteMode === 'range' ? t.intro.scaleTitle : t.intro.colorsTitle}</Text>
  {voteMode === 'range' && <Text preset={TEXT_PRESET.paragraph}>{t.intro.scaleHint}</Text>}
  <VoteLegend mode={voteMode} />
  ```
  and drop the `ColorCards` import. Callers (`ParticipantView`, `PresenterView`) pass `voteMode={session.voteMode}`.
- `ParticipantView.tsx`: `onSubmitVote: (vote: Vote) => void` (import `Vote`, drop `VoteColor, VoteTrend`); `{!isPicking && <VoteLegend mode={session.voteMode} category={category} />}`; `VotingPanel` gets `voteMode={session.voteMode}` and `onSubmitVote={(vote) => { setEditingIndex(null); onSubmitVote(vote); }}`.
- `PresenterView.tsx`: both `ColorCards` uses become `<VoteLegend mode={session.voteMode} category={category} large />`.
- `CurrentCategory.tsx` and `FacilitatorView.tsx`: `onSubmitVote` / `submitVote` typed `(vote: Vote) => void`; `VotingPanel` gets `voteMode={session.voteMode}`.
- `SessionPage.tsx`: `handleSubmitVote = useCallback((vote: Vote) => { if (session) store.submitVote(session, vote).catch(warn); }, [session]);` (adjust imports).

- [ ] **Step 7: Styles**

Append to `src/styles/main.css`:

```css
/* Range vote: the 1 and 9 wording above the slider, the picked value below it */
.score-input {
  display: flex;
  flex-direction: column;
  gap: calc(var(--ods-theme-column-gap) * 2);
}

.score-input__ends {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(var(--ods-theme-column-gap) * 2);
}

.score-input__end--high {
  text-align: right;
}

.score-input__value {
  text-align: center;
}

.scale-cards__card {
  display: flex;
  flex-direction: column;
  gap: var(--ods-theme-row-gap);
}

.scale-cards--large .scale-cards__score {
  font-size: 3rem;
}
```

- [ ] **Step 8: Build, test, check by hand**

Run: `npm run build && npm test`
Expected: PASS.

Manual (the repo has no component tests; the workshop script covers Colors): `npm run dev`, create a session in Range mode (Task 3 form), join as a participant at phone width and check: the slider shows "Move the slider to pick a score"; **submitting without touching it** shows "Pick a score from 1 to 9." and focuses the slider; clicking the track at 5 or pressing → from the thumb records a value; the trend is still required; editing a submitted vote preselects its score; keyboard-only works; `fr` strings show.

- [ ] **Step 9: Commit**

```bash
git add src/components/ScoreInput.tsx src/components/ScaleCards.tsx src/components/VoteLegend.tsx
git commit -m "feat: vote with an ODS Range in range sessions" -- src/components/ScoreInput.tsx src/components/ScaleCards.tsx src/components/VoteLegend.tsx src/components/voteOptions.ts src/components/VotingPanel.tsx src/components/IntroContent.tsx src/components/ParticipantView.tsx src/components/PresenterView.tsx src/components/facilitator/CurrentCategory.tsx src/components/facilitator/FacilitatorView.tsx src/pages/SessionPage.tsx src/lib/i18n.ts src/styles/main.css
```

---

### Task 5: Range results: histogram, median, named votes

**Files:**
- Create: `src/components/ScoreHistogram.tsx`, `src/components/VoteBreakdown.tsx`
- Modify: `src/components/ResultsGrid.tsx`, `MedianBadge.tsx`, `VoteSummary.tsx`, `NamedVotes.tsx`, `PresenterView.tsx`, `SessionFinished.tsx`, `facilitator/FacilitatorView.tsx`, `facilitator/FinishedNotes.tsx`, `facilitator/PreviousResult.tsx`, `src/lib/i18n.ts`, `src/styles/main.css`, `docs/specs/2026-10-13-range-vote-mode-design.md`

**Interfaces:**
- Consumes: `scoreCounts`, `trendCounts`, `medianScore`, `formatScore`, `rangeVotes`, `sameCell`; `TREND_OPTIONS_WORST_FIRST`.
- Produces: `<ScoreHistogram votes={RangeVote[]} compact? offlineVotes?={RangeVote[]} onAdjust?={(vote: RangeVote, delta: 1 | -1) => void} />`; `<VoteBreakdown votes voteMode compact />`; `MedianBadge` props `{ score, large?, voteMode? }`; `VoteSummary` props gain `voteMode?`; `ResultsGrid` props gain `voteMode: VoteMode`.

- [ ] **Step 1: Strings**

`en`: `results.histogramCaption: 'Votes by score'`, `results.trendsCaption: 'Votes by trend'`, `results.median: 'median'`, `results.scoreOutOf: (n: string) => \`${n} / 9\``; `facilitator.addOfflineScore: (score: number, trend: string) => \`Add a vote: ${score}, ${trend}\``, `facilitator.removeOfflineScore: (score: number, trend: string) => \`Remove a vote you added: ${score}, ${trend}\``, `facilitator.offlineScoreInCell: (n: number) => \`${plural(n, 'vote')} added manually\``, `facilitator.offlineTrend: 'Trend of the votes you add'`.
`fr`: `histogramCaption: 'Votes par note'`, `trendsCaption: 'Votes par tendance'`, `median: 'médiane'`, `scoreOutOf: (n) => \`${n} / 9\``, `addOfflineScore: (score, trend) => \`Ajouter un vote : ${score}, ${trend}\``, `removeOfflineScore: (score, trend) => \`Retirer un vote ajouté : ${score}, ${trend}\``, `offlineScoreInCell: (n) => \`${pluralFr(n, 'vote')} ajouté${n > 1 ? 's' : ''} manuellement\``, `offlineTrend: 'Tendance des votes ajoutés'`.

- [ ] **Step 2: `ScoreHistogram`**

Create `src/components/ScoreHistogram.tsx`:

```tsx
import { useState } from 'react';
import {
  Button,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  Radio,
  RadioControl,
  RadioGroup,
  RadioLabel,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { RangeVote, VoteTrend } from '../types';
import { MAX_SCORE, MIN_SCORE, medianScore, scoreCounts, trendCounts } from '../lib/voteScore';
import { t as messages } from '../lib/i18n';
import { TREND_OPTIONS_WORST_FIRST } from './voteOptions';

const SCORES = Array.from({ length: MAX_SCORE - MIN_SCORE + 1 }, (_, i) => MIN_SCORE + i);

interface Props {
  votes: RangeVote[];
  compact?: boolean;
  /** The facilitator's votes for people without the app, already in `votes`: only these can be removed */
  offlineVotes?: RangeVote[];
  /** Shows + and − under each score to add or remove an offline vote */
  onAdjust?: (vote: RangeVote, delta: 1 | -1) => void;
}

/**
 * Votes per score from 1 to 9 as bars, the median marked (both neighbours when it is a half),
 * and the trend counts below. The counts are text, so the bars are decoration for the eye only.
 */
function ScoreHistogram({ votes, compact = false, offlineVotes = [], onAdjust }: Props) {
  /* The trend of the votes the facilitator adds with +: a vote has a score and a trend */
  const [addTrend, setAddTrend] = useState<VoteTrend>('stable');
  const counts = scoreCounts(votes);
  const added = scoreCounts(offlineVotes);
  const trends = trendCounts(votes);
  const median = medianScore(votes);
  const medians = median === null ? [] : [...new Set([Math.floor(median), Math.ceil(median)])];
  const max = Math.max(1, ...counts);
  const trendLabel = (trend: VoteTrend) => TREND_OPTIONS_WORST_FIRST.find((o) => o.value === trend)!.label;
  /* Removing prefers an added vote of the chosen trend, else any added vote of that score */
  const removable = (score: number) =>
    offlineVotes.find((v) => v.score === score && v.trend === addTrend) ??
    offlineVotes.find((v) => v.score === score);

  return (
    <div className={compact ? 'stack score-histogram score-histogram--compact' : 'stack score-histogram'}>
      <table className="score-histogram__table">
        <caption className="visually-hidden">{messages.results.histogramCaption}</caption>
        <thead>
          <tr>
            {SCORES.map((score) => (
              <th key={score} scope="col" className="score-histogram__score">
                <Text preset={compact ? TEXT_PRESET.label : TEXT_PRESET.heading5} as="span">{score}</Text>
                {medians.includes(score) && (
                  <>
                    <span className="score-histogram__median" aria-hidden="true">▲</span>
                    <span className="visually-hidden"> ({messages.results.median})</span>
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {SCORES.map((score) => {
              const n = counts[score - MIN_SCORE];
              const manual = added[score - MIN_SCORE];
              const removal = removable(score);
              return (
                <td key={score} className="score-histogram__cell">
                  <span className="score-histogram__bars" aria-hidden="true">
                    <span
                      className={
                        medians.includes(score)
                          ? 'score-histogram__bar score-histogram__bar--median'
                          : 'score-histogram__bar'
                      }
                      style={{ '--bar-height': `${(n / max) * 100}%` } as React.CSSProperties}
                    />
                  </span>
                  <span className="score-histogram__count">
                    <Text preset={n ? (compact ? TEXT_PRESET.label : TEXT_PRESET.heading4) : TEXT_PRESET.caption} as="span">
                      {n}
                    </Text>
                    {manual > 0 && (
                      <span className="vote-matrix__manual" title={messages.facilitator.offlineScoreInCell(manual)}>
                        <Icon name={ICON_NAME.pen} aria-hidden="true" />
                        <span className="visually-hidden">{messages.facilitator.offlineScoreInCell(manual)}</span>
                      </span>
                    )}
                  </span>
                  {onAdjust && (
                    <span className="inline vote-matrix__adjust">
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        disabled={!removal}
                        aria-label={messages.facilitator.removeOfflineScore(score, trendLabel(removal?.trend ?? addTrend))}
                        title={messages.facilitator.removeOfflineScore(score, trendLabel(removal?.trend ?? addTrend))}
                        onClick={() => removal && onAdjust(removal, -1)}
                      >
                        <Icon name={ICON_NAME.minus} />
                      </Button>
                      <Button
                        size={BUTTON_SIZE.xs}
                        variant={BUTTON_VARIANT.ghost}
                        aria-label={messages.facilitator.addOfflineScore(score, trendLabel(addTrend))}
                        title={messages.facilitator.addOfflineScore(score, trendLabel(addTrend))}
                        onClick={() => onAdjust({ score, trend: addTrend }, 1)}
                      >
                        <Icon name={ICON_NAME.plus} />
                      </Button>
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <ul className="inline wrap score-histogram__trends" aria-label={messages.results.trendsCaption}>
        {TREND_OPTIONS_WORST_FIRST.map(({ value, label, icon }) => (
          <li key={value} className="inline score-histogram__trend">
            <Icon name={icon} aria-hidden="true" />
            <Text preset={TEXT_PRESET.paragraph} as="span">{label}: {trends[value]}</Text>
          </li>
        ))}
      </ul>

      {onAdjust && (
        <RadioGroup
          className="score-histogram__add-trend"
          orientation="horizontal"
          aria-label={messages.facilitator.offlineTrend}
          value={addTrend}
          onValueChange={({ value }) => setAddTrend(value as VoteTrend)}
        >
          {TREND_OPTIONS_WORST_FIRST.map(({ value, label, icon }) => (
            <Radio key={value} value={value}>
              <RadioControl />
              <RadioLabel>
                <Icon name={icon} aria-hidden="true" />
                <span>{label}</span>
              </RadioLabel>
            </Radio>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}

export default ScoreHistogram;
```

Create `src/components/VoteBreakdown.tsx`:

```tsx
import { Vote, VoteMode } from '../types';
import { colorVotes, rangeVotes } from '../lib/voteScore';
import ScoreHistogram from './ScoreHistogram';
import VoteMatrix from './VoteMatrix';

/** A category's votes as the mode shows them: the colour × trend matrix, or the score histogram */
function VoteBreakdown({ votes, voteMode, compact = false }: { votes: Vote[]; voteMode: VoteMode; compact?: boolean }) {
  return voteMode === 'range' ? (
    <ScoreHistogram votes={rangeVotes(votes)} compact={compact} />
  ) : (
    <VoteMatrix votes={colorVotes(votes)} compact={compact} />
  );
}

export default VoteBreakdown;
```

- [ ] **Step 3: Use it in the results views**

- `ResultsGrid.tsx`: add prop `voteMode: VoteMode`; replace the `VoteMatrix` line with
  ```tsx
  {voteMode === 'range' ? (
    <ScoreHistogram votes={rangeVotes(votes)} offlineVotes={rangeVotes(offlineVotes ?? [])} onAdjust={onAdjust} />
  ) : (
    <VoteMatrix votes={colorVotes(votes)} offlineVotes={colorVotes(offlineVotes ?? [])} onAdjust={onAdjust} />
  )}
  ```
  (`onAdjust` typed `(vote: Vote, delta) => void` accepts both) and `NamedVotes` receives `voteMode`. Callers pass `voteMode={session.voteMode}`: `FacilitatorView` (both uses) and `PresenterView`.
- `SessionFinished.tsx`: `<VoteBreakdown votes={result.votes} voteMode={session.voteMode} compact />`; `<VoteSummary votes={result.votes} prefix={false} voteMode={session.voteMode} />`.
- `PresenterView.tsx`, `FacilitatorView.tsx`, `FinishedNotes.tsx`: pass `voteMode={session.voteMode}` to every `VoteSummary`.
- `NamedVotes.tsx`: add prop `voteMode: VoteMode`. In the `map`, build the badge per shape:
  ```tsx
  const range = isRangeVote(vote);
  const color = range ? undefined : COLOR_OPTIONS.find((o) => o.value === vote.color)!;
  const trend = TREND_OPTIONS.find((o) => o.value === vote.trend)!;
  const summary = range ? t.results.scoreOutOf(String(vote.score)) : color!.label;
  …
  <Badge className="named-votes__badge" color={color ? color.badge : BADGE_COLOR.neutral} size={BADGE_SIZE.lg}>
    {quick && <span aria-hidden="true">⚡ </span>}
    <span className="named-votes__name">{name ?? t.results.unknownVoter}</span>
    {range && <span aria-hidden="true">{vote.score}</span>}
    <Icon name={trend.icon} aria-hidden="true" />
    <span className="visually-hidden">
      {' — '}
      {summary}, {trend.label}
      {quick && `, ${t.facilitator.quickVote}`}
    </span>
  </Badge>
  ```
  (import `BADGE_COLOR` and `isRangeVote`. `NamedVotes` takes no `voteMode`: the shape of each vote says which mode it is.)
- `MedianBadge.tsx`: add `voteMode?: VoteMode` (default `'colors'`); when `'range'` return
  ```tsx
  <Badge className="vote-summary__badge" color={BADGE_COLOR.neutral} size={large ? BADGE_SIZE.lg : BADGE_SIZE.md}>
    {t.results.scoreOutOf(formatScore(score))}
  </Badge>
  ```
  before the color branch (`import { BADGE_COLOR }`, `t`, `formatScore`).
- `VoteSummary.tsx`: add `voteMode?: VoteMode`, pass to `MedianBadge`.
- `PreviousResult.tsx`: add `voteMode: VoteMode` prop, pass to `MedianBadge`; callers (`FacilitatorView`, `FinishedNotes`) pass `session.voteMode`. (Comparison between modes is excluded in Task 6.)

- [ ] **Step 4: Styles**

Append to `src/styles/main.css`:

```css
/* Range results: nine bars, the median marked with a triangle as well as a darker bar */
.score-histogram__table {
  margin-inline: auto;
  border-collapse: separate;
  border-spacing: var(--ods-theme-column-gap);
}

.score-histogram__score {
  font-weight: normal;
  text-align: center;
}

.score-histogram__median {
  display: block;
  font-size: 0.75rem;
  line-height: 1;
}

.score-histogram__cell {
  min-width: 56px;
  text-align: center;
  vertical-align: bottom;
}

.score-histogram__bars {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 140px;
}

.score-histogram--compact .score-histogram__bars {
  height: 56px;
}

.score-histogram--compact .score-histogram__cell {
  min-width: 28px;
}

.score-histogram__bar {
  display: block;
  height: var(--bar-height);
  min-height: 2px;
  border-radius: var(--ods-theme-border-radius);
  background-color: var(--ods-color-primary-300);
}

.score-histogram__bar--median {
  background-color: var(--ods-color-primary-700);
}

.score-histogram__trends {
  justify-content: center;
  gap: calc(var(--ods-theme-column-gap) * 3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.score-histogram__add-trend {
  justify-content: center;
}
```

(If `--ods-color-primary-300/700` are not defined in this theme, use the shades `main.css` already uses for primary, e.g. grep `--ods-color-primary`.)

- [ ] **Step 5: Amend the spec** (the offline controls need a trend, which the spec skipped)

In `docs/specs/2026-10-13-range-vote-mode-design.md`, Results section, replace the bullet "The facilitator's offline "+/−" controls sit on each bar (score) and on each trend count, as they sit on matrix cells today." with: "The facilitator's offline "+/−" controls sit under each bar. A vote needs a score *and* a trend, so a small trend selector (↗ → ↘, default stable) sets the trend of the votes added with "+"; "−" removes an added vote of that score, preferring the selected trend."

- [ ] **Step 6: Build, test, check by hand**

Run: `npm run build && npm test`
Expected: PASS.

Manual: Range session with two browsers: live results for the facilitator show the histogram filling; **+/−** adds and removes offline votes at the right bar with the selected trend, reset works; reveal shows median marked (two bars for an even count such as 4 and 5); presenter and finished screens show the compact histogram and a neutral "N / 9" badge; named votes (anonymity off) show names with scores; Colors sessions look unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/ScoreHistogram.tsx src/components/VoteBreakdown.tsx
git commit -m "feat: show range votes as a score histogram" -- src/components/ScoreHistogram.tsx src/components/VoteBreakdown.tsx src/components/ResultsGrid.tsx src/components/MedianBadge.tsx src/components/VoteSummary.tsx src/components/NamedVotes.tsx src/components/PresenterView.tsx src/components/SessionFinished.tsx src/components/facilitator/FacilitatorView.tsx src/components/facilitator/FinishedNotes.tsx src/components/facilitator/PreviousResult.tsx src/lib/i18n.ts src/styles/main.css docs/specs/2026-10-13-range-vote-mode-design.md
```

---

### Task 6: Exports, session JSON and history

**Files:**
- Modify: `src/lib/exportReport.ts`, `src/lib/pdfReport.ts`, `src/lib/sessionHistory.ts`, `public/session-export.schema.json`, `src/lib/i18n.ts`, `src/components/facilitator/FacilitatorView.tsx`, `src/components/facilitator/FinishedNotes.tsx`
- Test: `src/lib/exportReport.test.ts`, `src/lib/pdfReport.test.ts`, `src/lib/sessionHistory.test.ts`

**Interfaces:**
- Consumes: `scoreCounts`, `trendCounts`, `formatScore`, `rangeVotes`, `VoteMode`.
- Produces: `scoreSummary(votes: Vote[]): string` (`"7 ×2 · 9 ×1"`, non-zero scores ascending), `trendSummary(votes: Vote[], labels: Record<VoteTrend, string>): string` (`"Improving 2 · Stable 1 · Getting worse 0"`), both in `exportReport.ts`; `SessionExport.voteMode?: VoteMode` (written only for `'range'`); `findPrevious(previous, category, voteMode = 'colors')`.

- [ ] **Step 1: Strings**

`en` `report`: `scoresLine: (parts: string) => \`Scores: ${parts}\``, `trendsLine: (parts: string) => \`Trends: ${parts}\``. `fr` `report`: `scoresLine: (parts) => \`Notes : ${parts}\``, `trendsLine: (parts) => \`Tendances : ${parts}\``. (`results.scoreOutOf` from Task 5 is reused.)

- [ ] **Step 2: Write the failing tests**

`src/lib/exportReport.test.ts` — add `voteMode: 'colors'` handling is already in the fixture; extend `finished` with an optional `voteMode` parameter:
change the signature to `function finished(allResults, namedVotes = {}, voteMode: ClientSessionState['voteMode'] = 'colors')` and return `voteMode` in place of the fixture's `voteMode: 'colors'`. Then add (import `scoreSummary, trendSummary` too):

```ts
const rangeVotes: CategoryResult = {
  categoryIndex: 0,
  votes: [
    { score: 7, trend: 'up' },
    { score: 9, trend: 'up' },
    { score: 7, trend: 'stable' },
  ],
  notes: 'good vibes',
};

describe('range sessions', () => {
  it('summarises scores and trends without any color', () => {
    expect(scoreSummary(rangeVotes.votes)).toBe('7 ×2 · 9 ×1');
    expect(trendSummary(rangeVotes.votes, { up: 'Improving', stable: 'Stable', down: 'Getting worse' })).toBe(
      'Improving 2 · Stable 1 · Getting worse 0',
    );
  });

  it('writes the median out of 9, the scores and the trends', () => {
    const md = generateMarkdown(finished([rangeVotes, empty(1)], {}, 'range'));
    expect(section(md, '### 1. Fun', '### 2. Ownership')).toBe(
      '### 1. Fun (3 votes)\nMedian: 7/9\nScores: 7 ×2 · 9 ×1\nTrends: ↗ 2 · → 1 · ↘ 0\n\ngood vibes\n\n',
    );
    expect(section(md, '### 2. Ownership')).toBe('### 2. Ownership (0 votes)\nMedian: —\n\n');
    expect(md).not.toMatch(/🟢|🟠|🔴/);
  });
});
```

`src/lib/sessionHistory.test.ts`:

```ts
describe('range sessions', () => {
  const rangeResults: CategoryResult[] = [
    { categoryIndex: 0, votes: [{ score: 4, trend: 'up' }, { score: 5, trend: 'down' }], notes: '' },
    { categoryIndex: 1, votes: [], notes: '' },
  ];
  const rangeExport = toSessionExport({ categories, allResults: rangeResults, totalVoters: 3, voteMode: 'range' }, new Date(2026, 9, 6), 'en');

  it('records the mode and the median score, and only for range sessions', () => {
    expect(rangeExport.voteMode).toBe('range');
    expect(rangeExport.categories[0].median).toBe(4.5);
    expect('voteMode' in exported).toBe(false);
  });

  it('reads the mode back, and validates against the published schema', () => {
    expect(parseSessionExport(JSON.stringify(rangeExport))).toEqual(rangeExport);
    expect(parseSessionExport(JSON.stringify({ ...rangeExport, voteMode: 'stars' }))).toBeNull();
    const validate = new Ajv2020().compile(schema);
    expect(validate(rangeExport)).toBe(true);
    expect(validate({ ...rangeExport, voteMode: 'stars' })).toBe(false);
  });

  it('does not compare a session with a previous one of the other mode', () => {
    expect(findPrevious(rangeExport, categories[0], 'range')?.median).toBe(4.5);
    expect(findPrevious(rangeExport, categories[0], 'colors')).toBeUndefined();
    expect(findPrevious(exported, categories[0], 'range')).toBeUndefined();
    expect(findPrevious(exported, categories[0])?.name).toBe('Fun');
  });
});
```
(`exported`, `categories`, `schema`, `Ajv2020`, `findPrevious` already exist in that test file.)

`src/lib/pdfReport.test.ts`: make `finished` take `voteMode` (same pattern), and `readPDF(results, lang, voteMode = 'colors')` pass it through to `finished`. Add:

```ts
  it('holds the median out of 9, the scores and the trends for a range session, all tagged', async () => {
    const votes: CategoryResult = {
      categoryIndex: 0,
      votes: [{ score: 7, trend: 'up' }, { score: 9, trend: 'up' }, { score: 7, trend: 'stable' }],
      notes: '',
    };
    const { tags } = await readPDF([votes, ownership], 'en', 'range');
    expect(tags).toEqual([
      ['H1', 'Squad Health Check — 2026/10/06'],
      ['P', 'Date: 6 October 2026'],
      ['P', 'Voters: 2'],
      ['H2', 'Notes'],
      ['H3', '1. Fun'],
      ['P', '3 votes'],
      ['P', 'Median: 7/9'],
      ['P', 'Scores: 7 ×2 · 9 ×1'],
      ['P', 'Trends: Improving 2 · Stable 1 · Getting worse 0'],
      ['H3', '2. Ownership'],
      ['P', '0 votes'],
      ['P', 'Median: —'],
    ]);
  });
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- src/lib/exportReport.test.ts src/lib/sessionHistory.test.ts src/lib/pdfReport.test.ts`
Expected: FAIL (new helpers missing, mode unknown).

- [ ] **Step 4: Markdown helpers and output**

In `src/lib/exportReport.ts`: `import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';` and `import { MAX_SCORE, MIN_SCORE, formatScore, medianScore, rangeVotes, scoreCell, scoreCounts, trendCounts } from './voteScore';`. Add:

```ts
/** "7 ×2 · 9 ×1": each score that got votes, lowest first */
export function scoreSummary(votes: Vote[]): string {
  return scoreCounts(rangeVotes(votes))
    .flatMap((n, i) => (n ? [`${MIN_SCORE + i} ×${n}`] : []))
    .join(' · ');
}

/** "Improving 2 · Stable 1 · Getting worse 0", improving first */
export function trendSummary(votes: Vote[], labels: Record<VoteTrend, string>): string {
  const counts = trendCounts(votes);
  return (['up', 'stable', 'down'] as VoteTrend[]).map((trend) => `${labels[trend]} ${counts[trend]}`).join(' · ');
}

/** "7/9" for a Range median; a dash without votes */
export const scoreOutOf = (votes: Vote[]): string => {
  const score = medianScore(votes);
  return score === null ? '—' : `${formatScore(score)}/${MAX_SCORE}`;
};
```

In `generateMarkdown`, replace the per-category block with:

```ts
  for (const { n, title, result } of rows(session, lang)) {
    md += `### ${n}. ${title} (${m.votes(result.votes.length)})\n`;
    if (session.voteMode === 'range') {
      md += `${r.medianOf(scoreOutOf(result.votes))}\n`;
      if (result.votes.length) {
        const arrows = trendCounts(result.votes);
        md += `${r.scoresLine(scoreSummary(result.votes))}\n`;
        md += `${r.trendsLine(`↗ ${arrows.up} · → ${arrows.stable} · ↘ ${arrows.down}`)}\n`;
      }
      md += '\n';
    } else {
      md += `${r.medianOf(medianCell(result.votes))}\n\n`;
    }
    if (result.notes) md += `${result.notes}\n\n`;
  }
```

- [ ] **Step 5: PDF**

In `src/lib/pdfReport.ts`: import `{ scoreOutOf, scoreSummary, trendSummary }` from `./exportReport` (it already imports `formatDate, numericDate, rows` from there). Add after `drawMedian`:

```ts
/** Range sessions: the median out of 9, then the scores and the trends, as three one-line paragraphs */
function drawRangeSummary(doc: Doc, section: StructElement, votes: Vote[], x: number, y: number, lang: Lang) {
  const m = messagesFor(lang);
  style(doc, 'regular', 10, ODS.text);
  tagged(doc, section, 'P', () => write(doc, m.report.medianOf(scoreOutOf(votes)), x, y));
  if (!votes.length) return;
  tagged(doc, section, 'P', () => write(doc, m.report.scoresLine(scoreSummary(votes)), x, y + RANGE_LINE));
  tagged(doc, section, 'P', () =>
    write(doc, m.report.trendsLine(trendSummary(votes, m.trends)), x, y + 2 * RANGE_LINE),
  );
}

/** Height of one of the extra summary lines of a Range card */
const RANGE_LINE = 4.5;
```

(import `Vote` from `../types` if not yet imported there.) In `buildPDF`'s per-category loop:

- Compute `const rangeLines = session.voteMode === 'range' && result.votes.length ? 2 * RANGE_LINE : 0;` after `notesHeight` and use `const fullHeight = headerHeight + rangeLines + notesHeight + CARD_PADDING - 1;` and `const needed = Math.min(fullHeight, headerHeight + rangeLines + 2 + 2 * NOTE_LINE + CARD_PADDING);`.
- Replace `drawMedian(doc, section, result.votes, x, y, lang); y += 2;` with:
  ```ts
  if (session.voteMode === 'range') {
    drawRangeSummary(doc, section, result.votes, x, y, lang);
    y += rangeLines + 2;
  } else {
    drawMedian(doc, section, result.votes, x, y, lang);
    y += 2;
  }
  ```

- [ ] **Step 6: Session export**

In `src/lib/sessionHistory.ts`:

- `import { Category, ClientSessionState, VoteMode } from '../types';`
- `SessionExport` gains `/** Absent means 'colors'; medians of different modes are not comparable */ voteMode?: VoteMode;`
- `toSessionExport` parameter type: `session: Pick<ClientSessionState, 'categories' | 'allResults' | 'totalVoters'> & { voteMode?: VoteMode }`; the returned object becomes `{ version: 1, date: isoDay(date), voters: session.totalVoters, ...(session.voteMode === 'range' && { voteMode: 'range' as const }), categories: [...] }` (keep the `categories` mapping as is; key order: put `voteMode` after `voters`).
- `parseSessionExport`: after the `voters` check add `if (value.voteMode !== undefined && value.voteMode !== 'colors' && value.voteMode !== 'range') return null;` and return `...(value.voteMode === 'range' && { voteMode: 'range' as const }),` after `voters: value.voters,`.
- `findPrevious`:
  ```ts
  /** The previous session's entry for a category, matched on its stable name; none when its votes were of the other mode */
  export const findPrevious = (previous: SessionExport | null, category: Category, voteMode: VoteMode = 'colors') =>
    (previous?.voteMode ?? 'colors') === voteMode ? previous?.categories.find((c) => c.name === category.name) : undefined;
  ```
- Callers: `FacilitatorView.tsx` → `findPrevious(previous, session.categories[current], session.voteMode)`; `FinishedNotes.tsx` → `findPrevious(previous, session.categories[i], session.voteMode)`. In `ReportExports`/`downloadJSON`, `toSessionExport(session)` already receives the whole session, so `voteMode` flows.

In `public/session-export.schema.json`, add to `properties` (after `voters`):

```json
    "voteMode": {
      "description": "How people voted: 'colors' (a health color and a trend) or 'range' (a score from 1 to 9 and a trend). Absent means 'colors'. Medians of different modes are not comparable.",
      "enum": ["colors", "range"]
    },
```

and change the `median` description to: "Median vote weight from 1 to 9, possibly a half; null without votes. In 'colors' sessions 1 is red getting worse and 9 green improving; in 'range' sessions it is the median score."

- [ ] **Step 7: Run all tests and build**

Run: `npm test && npm run build`
Expected: PASS.

Validate a generated range PDF with veraPDF (CLAUDE.md): generate one via the app (finished Range session → PDF export), then `docker run --rm -v "$PWD":/data verapdf/cli --flavour ua1 --format text /data/<file>.pdf` → expected `PASS`.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: export range sessions to Markdown, PDF and JSON" -- src/lib/exportReport.ts src/lib/exportReport.test.ts src/lib/pdfReport.ts src/lib/pdfReport.test.ts src/lib/sessionHistory.ts src/lib/sessionHistory.test.ts public/session-export.schema.json src/lib/i18n.ts src/components/facilitator/FacilitatorView.tsx src/components/facilitator/FinishedNotes.tsx
```

---

### Task 7: Range fun facts

**Files:**
- Modify: `src/lib/funStats.ts`, `src/lib/i18n.ts`
- Test: `src/lib/funStats.test.ts`

**Interfaces:**
- Consumes: `voteWeight`, `colorOf`, existing helpers in `funStats.ts` (`unique`, `sized`, `mean`, `count`, `MIN_VOTES`, `MIN_PEOPLE`, `Cat`, `Person`, `Ctx`, `Definition`).
- Produces: `FunStatsInput.voteMode: VoteMode`; `FunStatParams.score?: string`; new ids in `FUN_STAT_IDS`: team `teamAverage, topMarks, rockBottom, bullseye, rubberBand, highFloor`; person `sunnyAverage, gloomyAverage, allOrNothing, middleGround, nineLives, oneTrickPony, rollercoaster`.

Behaviour: in Range sessions the colour-based stats `greenParty, redAlert, teamMood, flawless, splitRoom, redFree, pessimisticPal, optimisticOtter, blackOrWhite, fenceSitter, stormChaser, greenThumb, creatureOfHabit` are skipped; the median/spread/trend/gap/speed stats stay; the new ones apply to Range only. Colors sessions produce exactly what they do today.

- [ ] **Step 1: Write the failing tests**

In `src/lib/funStats.test.ts`: the existing `input()` builds a `FunStatsInput`, so give it `voteMode: 'colors'` (add `voteMode: 'colors',` in the returned object, and in the literal of the "no votes" test). Add:

```ts
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
```

Also update the texts test to pass a `score`: `.text({ name: 'X', category: 'C', value: '1', color: 'Red', score: '5' })`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/lib/funStats.test.ts`
Expected: FAIL (`voteMode` missing from the input, no Range ids).

- [ ] **Step 3: Strings**

`FunStatValues` in `i18n.ts` gains `score?: string;`.

`en` `funStats` (add after `slowBurner`):

```ts
    teamAverage: stat('Team Average', ({ value }) => `The average score of the whole health check was ${value}.`),
    topMarks: stat('Top Marks', ({ category, value }) => `${category} collected ${value} scores of 9, more than any other category.`),
    rockBottom: stat('Rock Bottom', ({ category, value }) => `${category} collected ${value} scores of 1, more than any other category.`),
    bullseye: stat('Bullseye', ({ category, value }) => `Everyone gave ${value} on ${category}.`),
    rubberBand: stat('Rubber Band', ({ category, value }) => `Scores on ${category} stretched from ${value}.`),
    highFloor: stat('High Floor', ({ value }) => `Nobody scored below ${value} in the whole health check.`),
    sunnyAverage: stat('Sunny Average', ({ name, value }) => `${name} scored highest on average: ${value}.`),
    gloomyAverage: stat('Gloomy Average', ({ name, value }) => `${name} scored lowest on average: ${value}.`),
    allOrNothing: stat('All or Nothing', ({ name, value }) => `${name} went for a 1 or a 9 in ${value} votes.`),
    middleGround: stat('Middle Ground', ({ name, value }) => `${name} picked a 5 in ${value} votes.`),
    nineLives: stat('Nine Lives', ({ name, value }) => `${name} gave ${value} scores of 9.`),
    oneTrickPony: stat('One-Trick Pony', ({ name, score, value }) => `${name} gave ${score} in ${value} of their votes.`),
    rollercoaster: stat('Rollercoaster', ({ name, value }) => `${name}'s scores ranged from ${value}.`),
```

`fr`:

```ts
    teamAverage: stat('Moyenne de la team', ({ value }) => `La note moyenne de tout le bilan est de ${value}.`),
    topMarks: stat('Pleins feux', ({ category, value }) => `${category} a récolté ${value} notes de 9, plus que toute autre catégorie.`),
    rockBottom: stat('Tout en bas', ({ category, value }) => `${category} a récolté ${value} notes de 1, plus que toute autre catégorie.`),
    bullseye: stat('En plein dans le mille', ({ category, value }) => `Tout le monde a mis ${value} sur ${category}.`),
    rubberBand: stat('Élastique', ({ category, value }) => `Les notes sur ${category} s'étalent de ${value}.`),
    highFloor: stat('Plancher haut', ({ value }) => `Personne n'a mis moins de ${value} sur tout le bilan.`),
    sunnyAverage: stat('Moyenne ensoleillée', ({ name, value }) => `${name} a mis les meilleures notes en moyenne : ${value}.`),
    gloomyAverage: stat('Moyenne grisouille', ({ name, value }) => `${name} a mis les notes les plus basses en moyenne : ${value}.`),
    allOrNothing: stat('Tout ou rien', ({ name, value }) => `${name} a choisi un 1 ou un 9 dans ${value} votes.`),
    middleGround: stat('Juste milieu', ({ name, value }) => `${name} a mis un 5 dans ${value} votes.`),
    nineLives: stat('Neuf vies', ({ name, value }) => `${name} a donné ${value} notes de 9.`),
    oneTrickPony: stat('Une seule note', ({ name, score, value }) => `${name} a donné ${score} dans ${value} de ses votes.`),
    rollercoaster: stat('Montagnes russes', ({ name, value }) => `Les notes de ${name} vont de ${value}.`),
```

- [ ] **Step 4: Implement**

In `src/lib/funStats.ts`:

- `import { ClientSessionState, NamedVote, Vote, VoteColor, VoteDelay, VoteMode } from '../types';`
- `FunStatParams` gains `score?: string;`.
- `FUN_STAT_IDS`: in the team line append `'teamAverage', 'topMarks', 'rockBottom', 'bullseye', 'rubberBand', 'highFloor'`; in the person line append `'sunnyAverage', 'gloomyAverage', 'allOrNothing', 'middleGround', 'nineLives', 'oneTrickPony', 'rollercoaster'`.
- `FunStatsInput` gains `/** How people voted: Range sessions get their own stats and skip the colour ones */ voteMode: VoteMode;`; `funStatsInput` returns `voteMode: session.voteMode,`.
- Above `DEFINITIONS` add:
  ```ts
  /** These read colours, so they only apply to Colors sessions */
  const COLOR_ONLY = new Set<FunStatId>([
    'greenParty', 'redAlert', 'teamMood', 'flawless', 'splitRoom', 'redFree', 'pessimisticPal',
    'optimisticOtter', 'blackOrWhite', 'fenceSitter', 'stormChaser', 'greenThumb', 'creatureOfHabit',
  ]);
  ```
- After `DEFINITIONS` add `RANGE_DEFINITIONS` (thresholds are plain numbers; `weights` are the scores in Range sessions):
  ```ts
  const outOf9 = (n: number) => `${n.toFixed(1)}/9`;
  const countOf = (weights: number[], pick: (w: number) => boolean) => weights.filter(pick).length;
  const span = (weights: number[]) => `${Math.min(...weights)} → ${Math.max(...weights)}`;

  const RANGE_DEFINITIONS: Definition[] = [
    /* Team */
    { id: 'teamAverage', group: 'team', emoji: '📊', compute: ({ allVotes }) =>
      allVotes.length >= MIN_VOTES ? { value: outOf9(mean(allVotes.map(voteWeight))) } : null },
    { id: 'topMarks', group: 'team', emoji: '🏆', compute: ({ cats }) => {
      const top = unique(cats, (c) => countOf(c.weights, (w) => w === 9));
      const nines = top && countOf(top.weights, (w) => w === 9);
      return top && nines && nines >= 2 ? { category: top.title, value: count(nines) } : null;
    } },
    { id: 'rockBottom', group: 'team', emoji: '🕳️', compute: ({ cats }) => {
      const top = unique(cats, (c) => countOf(c.weights, (w) => w === 1));
      const ones = top && countOf(top.weights, (w) => w === 1);
      return top && ones && ones >= 2 ? { category: top.title, value: count(ones) } : null;
    } },
    { id: 'bullseye', group: 'team', emoji: '🎯', compute: ({ cats }) => {
      const top = sized(cats).find((c) => c.weights.every((w) => w === c.weights[0]));
      return top ? { category: top.title, value: count(top.weights[0]) } : null;
    } },
    { id: 'rubberBand', group: 'team', emoji: '🪀', compute: ({ cats }) => {
      const gap = (c: Cat) => Math.max(...c.weights) - Math.min(...c.weights);
      const top = unique(sized(cats), gap);
      return top && gap(top) >= 6 ? { category: top.title, value: span(top.weights) } : null;
    } },
    { id: 'highFloor', group: 'team', emoji: '🏢', compute: ({ allVotes, cats }) => {
      if (cats.length < 2 || allVotes.length < MIN_VOTES) return null;
      const floor = Math.min(...allVotes.map(voteWeight));
      return floor >= 4 ? { value: count(floor) } : null;
    } },

    /* Person */
    { id: 'sunnyAverage', group: 'person', emoji: '🌞', compute: ({ people }) => {
      const p = unique(people, (x) => mean(x.weights));
      return p ? { name: p.name, value: outOf9(mean(p.weights)) } : null;
    } },
    { id: 'gloomyAverage', group: 'person', emoji: '🌫️', compute: ({ people }) => {
      const p = unique(people, (x) => mean(x.weights), 'min');
      return p ? { name: p.name, value: outOf9(mean(p.weights)) } : null;
    } },
    { id: 'allOrNothing', group: 'person', emoji: '🏁', compute: ({ people }) => {
      const extremes = (p: Person) => countOf(p.weights, (w) => w === 1 || w === 9);
      const p = unique(people, extremes);
      return p && extremes(p) >= 2 ? { name: p.name, value: count(extremes(p)) } : null;
    } },
    { id: 'middleGround', group: 'person', emoji: '🪑', compute: ({ people }) => {
      const fives = (p: Person) => countOf(p.weights, (w) => w === 5);
      const p = unique(people, fives);
      return p && fives(p) >= 2 ? { name: p.name, value: count(fives(p)) } : null;
    } },
    { id: 'nineLives', group: 'person', emoji: '🐈', compute: ({ people }) => {
      const nines = (p: Person) => countOf(p.weights, (w) => w === 9);
      const p = unique(people, nines);
      return p && nines(p) >= 2 ? { name: p.name, value: count(nines(p)) } : null;
    } },
    { id: 'oneTrickPony', group: 'person', emoji: '🐴', compute: ({ people }) => {
      const habit = (p: Person) => Math.max(...[...new Set(p.weights)].map((s) => countOf(p.weights, (w) => w === s)));
      const p = unique(people.filter((x) => x.weights.length >= 4), (x) => habit(x) / x.weights.length);
      if (!p || habit(p) / p.weights.length < 0.75) return null;
      const score = p.weights.find((s) => countOf(p.weights, (w) => w === s) === habit(p))!;
      return { name: p.name, score: count(score), value: `${habit(p)}/${p.weights.length}` };
    } },
    { id: 'rollercoaster', group: 'person', emoji: '🎢', compute: ({ people }) => {
      const gap = (p: Person) => Math.max(...p.weights) - Math.min(...p.weights);
      const p = unique(people, gap);
      return p && gap(p) >= 4 ? { name: p.name, value: span(p.weights) } : null;
    } },
  ];
  ```
- In `computeFunStats`, replace `return DEFINITIONS.flatMap(` with:
  ```ts
  const definitions =
    input.voteMode === 'range'
      ? [...DEFINITIONS.filter((d) => !COLOR_ONLY.has(d.id)), ...RANGE_DEFINITIONS]
      : DEFINITIONS;
  return definitions.flatMap(
  ```
  (keeping the callback unchanged).

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/funStats.test.ts && npm test && npm run build`
Expected: PASS (Colors-mode tests unchanged).

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add fun facts for range sessions" -- src/lib/funStats.ts src/lib/funStats.test.ts src/lib/i18n.ts
```

---

### Task 8: Docs, rules publication and end-to-end check

**Files:**
- Modify: `README.md`, `docs/specs/2026-10-13-range-vote-mode-design.md` (status line)

- [ ] **Step 1: README**

- Features › Votes and results: add a row `| 🔢 **Vote mode** | Chosen at creation: *Colors* (a health color and a trend) or *Range* (a score from 1 to 9 picked with a slider, and a trend). Range sessions show a score histogram with the median, their own fun facts, and exports with the scores 🔒 |`.
- Fun facts row: `FUN_STAT_IDS` holds 33 + 13 = 46 ids and `COLOR_ONLY` removes 13 of them in Range sessions, so write "picked from 33 (Colors sessions) or 33 (Range sessions, with facts about scores)", i.e. "picked from 33 in either mode"; confirm the counts with `node -e` against `FUN_STAT_IDS` before writing.
- Manual test checklist: add after the existing steps (renumber the summary count): "Range session: create with **Vote mode: Range**; B's form shows the slider with the category's 1 and 9 wording and no color; submit without touching the slider → "Pick a score from 1 to 9." and focus on the slider; vote 7 + a trend; A's live results show the histogram; add an offline vote with + (trend selector) and reset; reveal → median marked, presenter shows the histogram and a neutral `N / 9` badge; finish → fun facts about scores; the Markdown, PDF and JSON exports carry the scores. Rules Playground: `write` `{ "color": "red", "trend": "up" }` at `/sessions/<CODE>/votes/<idx>/<20-char key>` in a Range session → Denied; `write` `'colors'` at `/sessions/<CODE>/state/voteMode` as A → Denied."
- Project Structure: list `ScoreInput`, `ScoreHistogram`, `VoteBreakdown`, `VoteLegend`, `ScaleCards`.

- [ ] **Step 2: Publish the rules and verify** (CLAUDE.md; **before** pushing the app)

```bash
npx -y firebase-tools@latest database:set /.settings/rules database.rules.json \
  --project feoche-squad-health-check --instance feoche-squad-health-check-default-rtdb --force

npx -y firebase-tools@latest database:get /.settings/rules \
  --project feoche-squad-health-check --instance feoche-squad-health-check-default-rtdb \
  | python3 -c "import json,sys;print('IDENTICAL' if json.load(sys.stdin)==json.load(open('database.rules.json')) else 'DIFFERENT')"
```
Expected: `IDENTICAL`. (This is an outward-facing change to the live database: confirm with the user before running it.)

- [ ] **Step 3: End-to-end**

`npm run dev`, then two browsers as in the README checklist, once with **Colors** (nothing changed: matrix, color tiles, colored median) and once with **Range** (steps above), in `en` and `fr`, and with at least one Range vote edited before reveal. Run `npm run workshop` (Colors, default): expected to finish without issues or axe violations; run an axe check on the Range voting view and the histogram (`axe-core` is a dev dependency; the workshop script's `axe()` helper shows how) and fix any violation.

- [ ] **Step 4: Spec status and commit**

Change the spec's status line to `**Status:** Approved, implemented`. Commit:

```bash
git commit -m "docs: document the range vote mode" -- README.md docs/specs/2026-10-13-range-vote-mode-design.md
```

---

## Self-review notes

- **Spec coverage:** data model (Tasks 1–2), rules (2), creation form and lobby (3), voting with the ODS `Range` and the 1/9 wording and intro/legend (4), results histogram, trend strip, offline controls, named votes, median (5), exports and history (6), fun facts (7), docs, rules publication and checks (8). Spec change made on the way: offline controls need a trend selector (Task 5, step 5).
- **Type consistency:** `Vote` union, `Ballot = Vote & { key }`, `colorOf`/`colorVotes`/`rangeVotes`, `scoreCounts`/`trendCounts`/`cellKey`/`sameCell`/`formatScore` (Task 1) are the only helper names used in later tasks; `findPrevious(previous, category, voteMode)` and `toSessionExport(...& { voteMode? })` (Task 6) match their call sites.
- **Testing limits:** the repo has no component tests and no rules emulator (no Java), so UI and rules are verified by the manual checks in Tasks 4, 5 and 8 (Rules Playground), and the PDF by veraPDF; all pure logic (scoring, derivation, exports, history, fun facts) has Vitest coverage.

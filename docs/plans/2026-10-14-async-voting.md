# Asynchronous Voting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the facilitator create a session whose votes are collected before the meeting, so the meeting itself is spent on the results of each category.

**Architecture:** A new immutable `state.mode` (`'live' | 'async'`) and a new `collecting` phase. While `collecting`, vote, voter and ballot writes are valid for any category; "Start the meeting" moves to `revealed` on category 0 and Next Category goes `revealed → revealed`. Everything after the start (reveal, closed, ready, notes, exports) is the existing code, untouched.

**Tech Stack:** React 18, TypeScript, `@ovhcloud/ods-react` 19.7.0, Firebase Realtime Database (rules in `database.rules.json`), Vitest, Playwright + axe (`scripts/`).

**Spec:** `docs/specs/2026-10-14-async-voting-design.md`

## Global Constraints

- Project conventions are in `CLAUDE.md`: WCAG 2.2 AA (headings via ODS `Text` `as`, focus moved when a view replaces the focused control, `role="status"` for messages shown without focus, every hidden string in both languages).
- `database.rules.json` is **not** deployed by CI. Publish it and check it is identical **before** pushing the app to `main` (commands in `CLAUDE.md`, run in Task 8).
- The creation option is an ODS switch: in this codebase that is `Toggle` / `ToggleControl` / `ToggleLabel`, as used for `facilitatorVotes` in `src/pages/CreateSession.tsx`.
- The state field is `state.mode`, the label is **Asynchronous voting**: `voteMode` already means colors or range.
- Absent `state.mode` in the database means `'live'`: existing sessions must behave exactly as before.
- Commits: no `Co-Authored-By`, no tool paths, no `.claude` files; commit only the paths of the task (`git commit -- <paths>`), because the user stages work in parallel; do not push.
- Run `npx vitest run` and `npx tsc -p tsconfig.json --noEmit` before each commit; a task is not done with either failing.

## Review Focus

- A late participant (joins after the meeting started): sees "Voting is closed", cannot vote. Task 5 (`ParticipantView`) and Task 2 (rules).
- A participant who answered only some categories: the reveal and exports must cope with fewer votes in some categories. Task 1 test (partial answers) and Task 8 manual check.
- Participants vote before the facilitator has joined or opened the presenter window: no code path may assume a facilitator view exists during `collecting`. Task 6.
- Reload in the middle of the stepper: the participant lands back on their saved answers. Task 3 (listeners on every ballot) and Task 5.
- A live session must not become collecting or the reverse: rules reject `mode` changes and `collecting` on a live session. Task 2.
- Votes sent before the meeting must never count as "quick" (⚡) or as vote delays. Task 1 test.

## File Structure

| File | Responsibility |
|---|---|
| `docs/specs/2026-10-14-async-voting-design.md` | amended to match the decisions below |
| `src/types.ts` | `SessionMode`, `collecting` phase, new `ClientSessionState` fields |
| `src/lib/deriveClientState.ts` | derives `mode`, `answeredCounts`, `myVotedIndexes`, `myVotes`; `completedVoterCount` |
| `src/lib/voteText.ts` (new) | a vote in words, for the review step |
| `database.rules.json` | `state.mode`, `collecting` phase, vote writes in `collecting` |
| `src/lib/sessionStore.ts` | create with mode, `startMeeting`, async `nextCategory`, per-category `submitVote`, listeners on every own ballot |
| `src/lib/i18n.ts` | `settings.*` and `collecting.*` strings, EN and FR |
| `src/pages/CreateSession.tsx` | the switch |
| `src/components/CollectingView.tsx` (new) | the participant stepper and review |
| `src/components/facilitator/CollectingProgress.tsx` (new) | per-person progress for the facilitator and the presenter |
| `src/components/ParticipantView.tsx`, `FacilitatorView.tsx`, `FacilitatorControls.tsx`, `ParticipantsPanel.tsx`, `PresenterView.tsx`, `pages/SessionPage.tsx` | wiring |
| `scripts/workshop-async.mjs` (new) | end-to-end async scenario with axe |
| `README.md` | feature row, usage, checklist entry |

## Decisions that refine the spec (applied to the spec in Task 1)

1. An async session is **created directly in `collecting`** (no `lobby`, no `intro`): participants must be able to vote as soon as they have the code.
2. **No timer** in async: `roundStartedAt` and `roundStarts` are never written, and the "time per category" field and its time hint are hidden when the switch is on.
3. The review step has **no Submit button**: each vote is saved as it is given, so the step is a summary with edit links.
4. The end-to-end check is a new `scripts/workshop-async.mjs`, because `scripts/workshop.mjs` runs its scenario at the top level and cannot be extended in place.

---

### Task 1: Types, derived state and spec amendment

**Files:**
- Modify: `docs/specs/2026-10-14-async-voting-design.md`
- Modify: `src/types.ts`
- Modify: `src/lib/deriveClientState.ts`
- Create: `src/lib/voteText.ts`
- Test: `src/lib/deriveClientState.test.ts`, `src/lib/voteText.test.ts` (new)

**Interfaces:**
- Produces:
  - `SESSION_MODES`, `type SessionMode = 'live' | 'async'`, `SessionSettings.mode`, `SessionPhase` including `'collecting'`.
  - `ClientSessionState.mode: SessionMode`, `.answeredCounts: Record<string, number>` (eligible voter id → categories answered), `.myVotedIndexes: number[]` (ascending), `.myVotes: Record<number, Vote>` (ballots loaded).
  - `completedVoterCount(session: Pick<ClientSessionState, 'eligibleVoters' | 'answeredCounts' | 'categories'>): number`.
  - `voteText(vote: Vote): string`.
  - `SessionStateNode.mode?: SessionMode`.

- [ ] **Step 1: Amend the spec**

In `docs/specs/2026-10-14-async-voting-design.md`: set `**Status:** Approved`; in "Lifecycle" replace the async line with `async:  collecting → revealed (cat 0) → revealed (cat 1) → … → finished` and add "An async session is created directly in `collecting`: there is no lobby or intro." ; in "UI" replace the review-step bullet's trailing "then Submit" with "(no Submit button: each vote is saved as it is given)"; in "UI › Facilitator" replace "the live round, timer and auto-reveal controls are hidden in async mode" with "there is no timer in async: the time per category setting is hidden at creation, and `roundStartedAt` and `roundStarts` are never written"; in "Code touched" add `scripts/workshop-async.mjs` (a new script) instead of "an async session path in `workshop.mjs`", and the same swap in "Testing".

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/deriveClientState.test.ts` (and add `completedVoterCount` to its import list from `./deriveClientState`):

```ts
describe('async mode', () => {
  const asyncState = { phase: 'collecting' as const, currentCategoryIndex: 0, mode: 'async' as const };
  const key = 'k'.repeat(20);

  it('defaults to live and reads the mode', () => {
    expect(deriveClientState('ABC234', raw(), 'bob')!.mode).toBe('live');
    expect(deriveClientState('ABC234', raw({ state: asyncState }), 'bob')!.mode).toBe('async');
  });

  it('counts the categories each eligible voter answered, and lists my own answers', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: asyncState,
        voters: { 0: { bob: 1, fac: 1 }, 2: { bob: 1 } },
        ballots: {
          '0': { key, color: 'red', trend: 'down' },
          '2': { key, color: 'green', trend: 'up' },
        },
      }),
      'bob',
    )!;
    expect(s.answeredCounts).toEqual({ fac: 1, bob: 2 });
    expect(s.myVotedIndexes).toEqual([0, 2]);
    expect(s.myVotes).toEqual({
      0: { color: 'red', trend: 'down' },
      2: { color: 'green', trend: 'up' },
    });
  });

  it('knows a voted category whose ballot has not loaded yet', () => {
    const s = deriveClientState('ABC234', raw({ state: asyncState, voters: { 1: { bob: 1 } } }), 'bob')!;
    expect(s.myVotedIndexes).toEqual([1]);
    expect(s.myVotes).toEqual({});
  });

  it('counts the voters who answered every category', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: asyncState,
        voters: { 0: { bob: 1, fac: 1 }, 1: { bob: 1, fac: 1 }, 2: { bob: 1 } },
      }),
      'fac',
    )!;
    expect(completedVoterCount(s)).toBe(1);
  });

  it('never marks a voter as quick: the votes came in before the meeting', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { ...asyncState, phase: 'revealed', roundStartedAt: 10_000 },
        voters: { 0: { bob: 500 } },
      }),
      'fac',
    )!;
    expect(s.quickVoterIds).toEqual([]);
  });

  it('keeps results available for categories where only some voted', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { ...asyncState, phase: 'revealed' },
        voters: { 0: { bob: 1 } },
        votes: { 0: { [key]: { color: 'green', trend: 'up' } } },
      }),
      'fac',
    )!;
    expect(s.currentResults).toHaveLength(1);
    expect(s.voteCount).toBe(1);
    expect(s.totalVoters).toBe(2);
  });
});

describe('summaryIndexes in async', () => {
  it('lists no category while collecting', () => {
    expect(summaryIndexes({ phase: 'collecting', currentCategoryIndex: 0, categories })).toEqual([]);
  });
});
```

Create `src/lib/voteText.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { voteText } from './voteText';
import { t } from './i18n';

describe('voteText', () => {
  it('names a color vote with its trend', () => {
    expect(voteText({ color: 'green', trend: 'up' })).toBe(`${t.colors.green}, ${t.trends.up}`);
  });

  it('names a range vote with its trend', () => {
    expect(voteText({ score: 7, trend: 'stable' })).toBe(`${t.voting.scoreValue(7)}, ${t.trends.stable}`);
  });
});
```

- [ ] **Step 3: Run the tests and see them fail**

Run: `npx vitest run src/lib/deriveClientState.test.ts src/lib/voteText.test.ts`
Expected: FAIL (`mode`, `answeredCounts`, `completedVoterCount`, `voteText` not defined; `summaryIndexes` returns a non-empty list or type error for `'collecting'`).

- [ ] **Step 4: Implement `src/types.ts`**

After `Anonymity`, add:

```ts
/** When people vote: during the meeting, one category at a time, or beforehand on their own time */
export const SESSION_MODES = ['live', 'async'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];
```

In `SessionSettings` add `mode: SessionMode;` (first field). Change `SessionPhase` to `'lobby' | 'intro' | 'collecting' | 'voting' | 'revealed' | 'finished'`. In `ClientSessionState`, after `voteMode`, add:

```ts
  /** Absent in the database means 'live' (sessions created before asynchronous voting) */
  mode: SessionMode;
  /** Categories each eligible voter has voted on, by participant id: the progress of an async session's collecting phase */
  answeredCounts: Record<string, number>;
  /** Indexes of the categories the current user has voted on, ascending */
  myVotedIndexes: number[];
  /** The current user's votes by category index, for the ballots that have loaded */
  myVotes: Record<number, Vote>;
```

- [ ] **Step 5: Implement `src/lib/deriveClientState.ts`**

Add `SessionMode` to the `../types` import. In `SessionStateNode` add `/** Absent in sessions created before asynchronous voting: counts as 'live' */ mode?: SessionMode;`. In `deriveClientState`, after `const voteMode ...` add `const mode: SessionMode = raw.state.mode ?? 'live';`. Change `quickVoterIds` to:

```ts
  /* Async votes come in before the meeting: there is no round start to be quick against */
  const quickVoterIds = voterIds.filter((id) => {
    const votedAt = roundVoters[id];
    return (
      mode === 'live' && roundStartedAt !== null && typeof votedAt === 'number' && votedAt - roundStartedAt < QUICK_VOTE_MS
    );
  });
```

After `eligibleVoters` is defined (before `voterIds`) nothing changes; after `voterIds` add:

```ts
  const answeredCounts: Record<string, number> = {};
  for (const p of eligibleVoters) {
    answeredCounts[p.id] = categories.filter((_, i) => at(raw.voters, i)?.[p.id]).length;
  }
  const myVotedIndexes = categories.flatMap((_, i) => (at(raw.voters, i)?.[myId] ? [i] : []));
  const myVotes: Record<number, Vote> = {};
  categories.forEach((_, i) => {
    const ballot = raw.ballots[String(i)];
    if (ballot) myVotes[i] = voteOf(ballot);
  });
```

Add `mode, answeredCounts, myVotedIndexes, myVotes,` to the returned object (next to `voteMode`). In `summaryIndexes`, change the condition to `session.phase === 'lobby' || session.phase === 'intro' || session.phase === 'collecting'`. Append:

```ts
/** Eligible voters who voted on every category: the ones whose async answers are complete */
export function completedVoterCount(
  session: Pick<ClientSessionState, 'eligibleVoters' | 'answeredCounts' | 'categories'>,
): number {
  return session.eligibleVoters.filter(
    (p) => (session.answeredCounts[p.id] ?? 0) >= session.categories.length,
  ).length;
}
```

- [ ] **Step 6: Implement `src/lib/voteText.ts`**

```ts
import { Vote } from '../types';
import { t } from './i18n';
import { isRangeVote } from './voteScore';

/** A vote in words: "Green, improving" or "7 out of 9, stable" */
export function voteText(vote: Vote): string {
  const main = isRangeVote(vote) ? t.voting.scoreValue(vote.score) : t.colors[vote.color];
  return `${main}, ${t.trends[vote.trend]}`;
}
```

- [ ] **Step 7: Run tests and the type check**

Run: `npx vitest run && npx tsc -p tsconfig.json --noEmit`
Expected: the new tests pass. `tsc` will flag every `ClientSessionState` or `SessionSettings` literal that lacks the new fields (test fixtures, `DEFAULT_SESSION_SETTINGS`); add `mode: 'live'`, `answeredCounts: {}`, `myVotedIndexes: []`, `myVotes: {}` there. `DEFAULT_SESSION_SETTINGS` is fixed in Task 3, so for now add `mode: 'live'` to it in `sessionStore.ts` to keep the tree compiling.

- [ ] **Step 8: Commit**

```bash
git add docs/specs/2026-10-14-async-voting-design.md src/types.ts src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts src/lib/voteText.ts src/lib/voteText.test.ts src/lib/sessionStore.ts
git commit -m "feat: derive async voting state" -- docs/specs/2026-10-14-async-voting-design.md src/types.ts src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts src/lib/voteText.ts src/lib/voteText.test.ts src/lib/sessionStore.ts
```

(Also include any fixture file `tsc` made you touch, by path.)

---

### Task 2: Database rules

**Files:**
- Modify: `database.rules.json`

**Interfaces:**
- Produces: rules that accept `state.mode`, the `collecting` phase (async sessions only), and vote/voter/ballot writes on any category while `collecting`.

There is no rules emulator in the repo; checks are a JSON parse and a pattern count here, and the Rules Playground steps of Task 8.

- [ ] **Step 1: Edit the `state` node**

In the `state` `.validate`, add `&& newData.child('mode').val() === data.child('mode').val()` inside the `(!data.exists() || (...))` group, after the `voteMode` comparison. Replace the `phase` line with:

```json
          "phase": { ".validate": "newData.parent().child('mode').val() === 'async' ? ((newData.val() === 'collecting' && (!data.exists() || data.val() === 'collecting')) || newData.val() === 'revealed' || newData.val() === 'finished') : (newData.val() === 'lobby' || newData.val() === 'intro' || newData.val() === 'voting' || newData.val() === 'revealed' || newData.val() === 'finished')" },
```

Add, after the `voteMode` line:

```json
          "mode": { ".validate": "newData.val() === 'live' || newData.val() === 'async'" },
```

- [ ] **Step 2: Open the vote writes while `collecting`**

Save this script as `<scratchpad>/rules_collecting.py` and run it from the repo root. It rewrites exactly the three `.write` lines that require "voting on the current category" (the `voters/$idx/$uid` write, the `votes/$idx/$key` write and the `ballots/$idx/$uid` write):

```python
import pathlib

p = pathlib.Path('database.rules.json')
PHASE_IDX = "root.child('sessions/' + $code + '/state/phase').val() === 'voting' && root.child('sessions/' + $code + '/state/currentCategoryIndex').val() + '' === $idx"
COLLECTING = "root.child('sessions/' + $code + '/state/phase').val() === 'collecting' && root.child('sessions/' + $code + '/meta/categories/' + $idx).exists()"
OPEN = f"(({PHASE_IDX}) || ({COLLECTING}))"
out, n = [], 0
for line in p.read_text().split('\n'):
    if '".write"' in line and PHASE_IDX in line:
        line = line.replace(PHASE_IDX, OPEN)
        n += 1
    out.append(line)
assert n == 3, f"expected 3 write lines, found {n}"
p.write_text('\n'.join(out))
```

- [ ] **Step 3: Check**

Run: `python3 -c "import json; json.load(open('database.rules.json')); print('valid')"` → `valid`.
Run: `grep -c "'collecting'" database.rules.json` → `5` (three writes, plus the two in the `phase` rule: one `collecting` test in each branch; if the count differs, re-read the diff with `git diff database.rules.json` and confirm each of the three write rules and the `phase` rule contains it).
Run: `git diff --stat database.rules.json` → only that file, a handful of lines changed.

- [ ] **Step 4: Commit** (do not publish yet; publishing happens in Task 8, before any push)

```bash
git commit -m "feat: let async sessions collect votes before the meeting (rules)" -- database.rules.json
```

---

### Task 3: Session store

**Files:**
- Modify: `src/lib/sessionStore.ts`

**Interfaces:**
- Consumes: Task 1 types (`SessionSettings.mode`, `ClientSessionState.mode/myVotedIndexes`).
- Produces: `startMeeting(s)`, `submitVote(s, vote, index?)`, async-aware `nextCategory`, `createSession` that starts async sessions in `collecting`.

The store has no unit tests (it is Firebase glue); it is covered by `tsc` here and by Task 7's end-to-end script.

- [ ] **Step 1: Settings and creation**

In `DEFAULT_SESSION_SETTINGS` set `mode: 'live',`. In `createSession`, replace the `state:` value with:

```ts
      state: { phase: settings.mode === 'async' ? 'collecting' : 'lobby', currentCategoryIndex: 0, ...settings },
```

- [ ] **Step 2: Listen to every own ballot while collecting**

Replace the `ballotListener` variable and `syncBallotListener` function with:

```ts
  const ballotUnsubs = new Map<number, Unsubscribe>();
```

```ts
  /* My own ballots: every category while collecting (any answer can be edited), else only the round being voted */
  const syncBallotListeners = () => {
    if (!raw.meta || !raw.state) return;
    const indexes =
      raw.state.phase === 'collecting'
        ? raw.meta.categories.map((_, i) => i)
        : [raw.state.currentCategoryIndex];
    for (const [index, unsubscribe] of ballotUnsubs) {
      if (indexes.includes(index)) continue;
      unsubscribe();
      ballotUnsubs.delete(index);
    }
    for (const index of indexes) {
      if (ballotUnsubs.has(index)) continue;
      ballotUnsubs.set(
        index,
        onValue(
          sessionRef(code, `ballots/${index}/${uid}`),
          (snap: DataSnapshot) => {
            raw.ballots[String(index)] = snap.val() as Ballot | null;
            emit();
          },
          warnCancelled(`ballots/${index}`),
        ),
      );
    }
  };
```

In `listen`, replace `if (key === 'state') syncBallotListener();` with `if (key === 'meta' || key === 'state') syncBallotListeners();`. In the cleanup returned by `subscribeSession`, replace `ballotListener?.unsubscribe();` with `ballotUnsubs.forEach((u) => u());`.

- [ ] **Step 3: Facilitator actions**

Add after `startVoting`:

```ts
/** Closes the voting window of an async session and opens the first category's results */
export async function startMeeting(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'collecting') return;
  await writeState(s, { phase: 'revealed', currentCategoryIndex: 0 });
}
```

Replace the body of `nextCategory` after the `idx >= ...` guard with:

```ts
  /* Async: the votes are already in, so the next category goes straight to its results, with no round to time */
  if (s.mode === 'async') {
    await update(sessionRef(s.code), {
      'state/currentCategoryIndex': idx + 1,
      [`closed/${idx}`]: true,
    });
    return;
  }
  await update(sessionRef(s.code), {
    'state/phase': 'voting',
    'state/currentCategoryIndex': idx + 1,
    'state/roundStartedAt': serverTimestamp(),
    [`roundStarts/${idx + 1}`]: serverTimestamp(),
    [`closed/${idx}`]: true,
  });
```

- [ ] **Step 4: Participant action**

Replace `submitVote` with:

```ts
/**
 * Voter flag, anonymous vote and private ballot are written atomically; rules require them together.
 * Once voted, the ballot's key lets the voter overwrite their vote until the round is revealed
 * (live) or the meeting starts (async, where any category can be voted while collecting).
 */
export async function submitVote(
  s: ClientSessionState,
  vote: Vote,
  index: number = s.currentCategoryIndex,
): Promise<void> {
  const open = s.phase === 'collecting' || (s.phase === 'voting' && index === s.currentCategoryIndex);
  if (!open || index < 0 || index >= s.categories.length) return;
  if (s.myVotedIndexes.includes(index)) {
    const ballot = await get(sessionRef(s.code, `ballots/${index}/${s.myId}`));
    if (!ballot.exists()) return;
    const { key } = ballot.val() as Ballot;
    await update(sessionRef(s.code), {
      [`votes/${index}/${key}`]: vote,
      [`ballots/${index}/${s.myId}`]: { key, ...vote },
    });
    return;
  }
  const key = randomKey();
  await update(sessionRef(s.code), {
    [`voters/${index}/${s.myId}`]: serverTimestamp(),
    [`votes/${index}/${key}`]: vote,
    [`ballots/${index}/${s.myId}`]: { key, ...vote },
  });
}
```

- [ ] **Step 5: Check and commit**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run` → both clean.

```bash
git commit -m "feat: collect votes for every category in async sessions (store)" -- src/lib/sessionStore.ts
```

---

### Task 4: Strings and the creation switch

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/pages/CreateSession.tsx`
- Test: `src/lib/i18n.test.ts` (existing, must keep passing: it checks EN and FR have the same shape)

**Interfaces:**
- Produces: `t.settings.asyncVoting`, `t.settings.asyncVotingHint`, `t.settings.votingTime`, `t.settings.modes`, and the `t.collecting` block below. Later tasks use these exact names.

- [ ] **Step 1: Strings**

In the `en` object, inside `settings`, add:

```ts
    asyncVoting: 'Asynchronous voting',
    asyncVotingHint:
      'Everyone votes on their own time before the meeting, which is then spent on the results of each category.',
    votingTime: 'Voting',
    modes: { live: 'During the meeting', async: 'Beforehand (asynchronous)' },
```

and a new top-level block after `lobby`:

```ts
  collecting: {
    title: 'Vote before the meeting',
    intro:
      'Vote on each category at your own pace. You can change your answers until the facilitator starts the meeting.',
    answered: (n: number, total: number) => `${n} of ${total} answered`,
    progress: 'Your progress',
    previous: 'Previous',
    next: 'Next',
    skip: 'Skip for now',
    saveAndNext: 'Save and continue',
    review: 'Review your answers',
    reviewTitle: 'Your answers',
    notAnswered: 'Not answered yet',
    answer: 'Answer',
    edit: 'Edit',
    saved: (category: string) => `Vote saved for ${category}`,
    allDone: 'All your answers are saved. You can come back to change them until the meeting starts.',
    missing: (n: number) => `${n} ${n !== 1 ? 'categories are' : 'category is'} still unanswered.`,
    loadingAnswer: 'Loading your answer…',
    closed: 'Voting is closed: the meeting has started.',
    shareHint: 'Send this code before the meeting so everyone can vote beforehand.',
    participation: (n: number, total: number) => `${n} of ${total} voted on every category`,
    perPerson: (name: string, n: number, total: number) => `${name}, ${n} of ${total} categories`,
    start: 'Start the meeting',
    startWarning: (names: string) => `Not finished: ${names}. They can no longer vote once the meeting starts.`,
    presenterTitle: 'Voting is open',
  },
```

In the `fr` object add the same keys:

```ts
    asyncVoting: 'Vote asynchrone',
    asyncVotingHint:
      "Chacun vote à son rythme avant la réunion, qui est ensuite consacrée aux résultats de chaque catégorie.",
    votingTime: 'Vote',
    modes: { live: 'Pendant la réunion', async: 'En amont (asynchrone)' },
```

```ts
  collecting: {
    title: 'Votez avant la réunion',
    intro:
      "Votez sur chaque catégorie à votre rythme. Vous pouvez modifier vos réponses jusqu'au début de la réunion.",
    answered: (n, total) => `${n} réponse${n > 1 ? 's' : ''} sur ${total}`,
    progress: 'Votre progression',
    previous: 'Précédent',
    next: 'Suivant',
    skip: 'Passer pour le moment',
    saveAndNext: 'Enregistrer et continuer',
    review: 'Relire vos réponses',
    reviewTitle: 'Vos réponses',
    notAnswered: 'Pas encore de réponse',
    answer: 'Répondre',
    edit: 'Modifier',
    saved: (category) => `Vote enregistré pour ${category}`,
    allDone: "Toutes vos réponses sont enregistrées. Vous pouvez les modifier jusqu'au début de la réunion.",
    missing: (n) => `${n} ${n > 1 ? 'catégories sont sans réponse' : 'catégorie est sans réponse'}.`,
    loadingAnswer: 'Chargement de votre réponse…',
    closed: 'Le vote est clos : la réunion a commencé.',
    shareHint: "Envoyez ce code avant la réunion pour que chacun puisse voter en amont.",
    participation: (n, total) => `${n} sur ${total} ont voté sur toutes les catégories`,
    perPerson: (name, n, total) => `${name}, ${n} catégorie${n > 1 ? 's' : ''} sur ${total}`,
    start: 'Démarrer la réunion',
    startWarning: (names) => `Pas terminé : ${names}. Ils ne pourront plus voter une fois la réunion démarrée.`,
    presenterTitle: 'Le vote est ouvert',
  },
```

- [ ] **Step 2: Run the i18n test**

Run: `npx vitest run src/lib/i18n.test.ts` → PASS (if the FR block's function parameter types are inferred from `Messages`, leave them untyped as the existing FR entries do).

- [ ] **Step 3: The switch**

In `src/pages/CreateSession.tsx`: add `SESSION_MODES` is not needed; import nothing new except what is already imported. Change `minutesInvalid` to ignore the field when it is hidden:

```ts
  const asyncVoting = settings.mode === 'async';
  const minutesInvalid = !asyncVoting && !isValidMinutes(Number(minutesText));
```

After the `facilitatorVotes` `Toggle`, add:

```tsx
          <Toggle
            checked={asyncVoting}
            onCheckedChange={({ checked }) =>
              setSettings((s) => ({ ...s, mode: checked ? 'async' : 'live' }))
            }
          >
            <ToggleControl />
            <ToggleLabel>{t.settings.asyncVoting}</ToggleLabel>
          </Toggle>
          <Text preset={TEXT_PRESET.caption}>{t.settings.asyncVotingHint}</Text>
```

Wrap the minutes `<FormField invalid={minutesInvalid}>…</FormField>` and the following `{categories.length > 0 && (<Message …>…</Message>)}` in `{!asyncVoting && (<> … </>)}` so both are hidden in async.

- [ ] **Step 4: Check and commit**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run` → clean.
Run the app (`npm run dev`), open the create page: the switch is off by default; turning it on hides "Time per category" and the time hint; the switch has a visible label.

```bash
git commit -m "feat: add the asynchronous voting switch" -- src/lib/i18n.ts src/pages/CreateSession.tsx
```

---

### Task 5: Participant stepper

**Files:**
- Create: `src/components/CollectingView.tsx`
- Modify: `src/components/VotingPanel.tsx` (optional `submitLabel`)
- Modify: `src/components/ParticipantView.tsx`
- Modify: `src/pages/SessionPage.tsx`
- Modify: the stylesheet that defines `.participant-view` (find it with `grep -rln "participant-view" src --include=*.css`)

**Interfaces:**
- Consumes: Task 1 (`myVotedIndexes`, `myVotes`, `voteText`), Task 3 (`submitVote(s, vote, index)`), Task 4 strings.
- Produces: `CollectingView` with props `{ session: ClientSessionState; onSubmitVote: (vote: Vote, index: number) => void }`; `onSubmitVote` of `ParticipantView` and `FacilitatorActions.submitVote` become `(vote: Vote, index?: number) => void`.

- [ ] **Step 1: `VotingPanel` label**

In `src/components/VotingPanel.tsx` add `submitLabel?: string;` to `Props`, destructure it, and render `{submitLabel ?? (initialVote ? t.voting.update : t.voting.submit)}` in the submit button.

- [ ] **Step 2: `CollectingView`**

Create `src/components/CollectingView.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  BUTTON_VARIANT,
  Icon,
  ICON_NAME,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, Vote } from '../types';
import VotingPanel from './VotingPanel';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';
import { voteText } from '../lib/voteText';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (vote: Vote, index: number) => void;
}

/**
 * An async session's voting window: one category at a time, then a review of every answer.
 * Each vote is saved as it is given, so leaving halfway keeps the progress.
 */
function CollectingView({ session, onSubmitVote }: Props) {
  const { categories, myVotes, myVotedIndexes, voteMode } = session;
  /* The last step, one past the categories, is the review */
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState('');
  const heading = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  const total = categories.length;
  const isReview = step >= total;

  /* The step replaces the control that had the focus: bring it to the new step's title */
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const progress = (
    <div className="stack collecting-view__progress">
      <Text preset={TEXT_PRESET.caption}>{t.collecting.answered(myVotedIndexes.length, total)}</Text>
      <ProgressBar value={myVotedIndexes.length} max={total} aria-label={t.collecting.progress} />
    </div>
  );

  const status = (
    <div role="status" className="visually-hidden">
      {saved}
    </div>
  );

  if (isReview) {
    const missing = total - myVotedIndexes.length;
    return (
      <div className="stack collecting-view collecting-view--review">
        {progress}
        <div ref={heading} tabIndex={-1} className="collecting-view__heading">
          <Text preset={TEXT_PRESET.heading2} as="h2">{t.collecting.reviewTitle}</Text>
        </div>
        <Text preset={TEXT_PRESET.paragraph}>
          {missing > 0 ? t.collecting.missing(missing) : t.collecting.allDone}
        </Text>
        <ul className="stack collecting-view__answers">
          {categories.map((category, i) => {
            const { title } = localizeCategory(category);
            const vote = myVotes[i];
            const answered = myVotedIndexes.includes(i);
            return (
              <li key={i} className="inline wrap collecting-view__answer">
                <Text preset={TEXT_PRESET.label}>{title}</Text>
                <Text preset={TEXT_PRESET.paragraph}>
                  {answered ? (vote ? voteText(vote) : t.collecting.loadingAnswer) : t.collecting.notAnswered}
                </Text>
                <Button variant={BUTTON_VARIANT.ghost} onClick={() => setStep(i)}>
                  <Icon name={answered ? ICON_NAME.pen : ICON_NAME.arrowRight} />
                  {answered ? t.collecting.edit : t.collecting.answer}
                  <span className="visually-hidden"> {title}</span>
                </Button>
              </li>
            );
          })}
        </ul>
        {status}
      </div>
    );
  }

  const category = categories[step];
  const { title, subtitle } = localizeCategory(category);
  const answered = myVotedIndexes.includes(step);
  const loading = answered && myVotes[step] === undefined;

  return (
    <div className="stack collecting-view">
      {progress}
      <div ref={heading} tabIndex={-1} className="collecting-view__heading">
        <Text preset={TEXT_PRESET.heading2} as="h2">{title}</Text>
        <Text preset={TEXT_PRESET.caption}>{t.categoryPosition(step + 1, total)}</Text>
        {subtitle && <Text>{subtitle}</Text>}
      </div>
      {loading ? (
        <Text preset={TEXT_PRESET.caption}>{t.collecting.loadingAnswer}</Text>
      ) : (
        <VotingPanel
          key={step}
          category={category}
          voteMode={voteMode}
          initialVote={myVotes[step] ?? null}
          submitLabel={t.collecting.saveAndNext}
          onSubmitVote={(vote) => {
            onSubmitVote(vote, step);
            setSaved(t.collecting.saved(title));
            setStep(step + 1);
          }}
        />
      )}
      <div className="actions collecting-view__nav">
        {step > 0 && (
          <Button variant={BUTTON_VARIANT.outline} onClick={() => setStep(step - 1)}>
            <Icon name={ICON_NAME.arrowLeft} />
            {t.collecting.previous}
          </Button>
        )}
        <Button variant={BUTTON_VARIANT.ghost} onClick={() => setStep(step + 1)}>
          {answered ? t.collecting.next : t.collecting.skip}
          <Icon name={ICON_NAME.arrowRight} />
        </Button>
      </div>
      {status}
    </div>
  );
}

export default CollectingView;
```

Check `t.categoryPosition` exists with signature `(n, total)` (used in `CurrentCategory.tsx`); the `ICON_NAME.arrowLeft`, `pen`, `arrowRight` names are used elsewhere in the repo. If `ProgressBar` or `Text` reject `ref`/props, adjust; the wrapper `div` already carries the ref.

- [ ] **Step 3: `ParticipantView`**

Import `CollectingView`. Change `onSubmitVote` in `Props` to `(vote: Vote, index?: number) => void`. After the `phase === 'lobby'` block add:

```tsx
  if (phase === 'collecting') {
    return (
      <div className="page page-narrow participant-view participant-view--collecting">
        <Text preset={TEXT_PRESET.heading2} as="h2">{t.collecting.title}</Text>
        <Text preset={TEXT_PRESET.paragraph}>{t.collecting.intro}</Text>
        <CollectingView session={session} onSubmitVote={onSubmitVote} />
      </div>
    );
  }
```

In the `phase === 'revealed'` block, after the "results on screen" `Text`, add:

```tsx
          {session.mode === 'async' && session.myVotedIndexes.length < categories.length && (
            <Text preset={TEXT_PRESET.caption}>{t.collecting.closed}</Text>
          )}
```

- [ ] **Step 4: `SessionPage`**

In `phaseAnnouncement` add `if (phase === 'collecting') return t.collecting.title;`. Change `handleSubmitVote` to:

```ts
  const handleSubmitVote = useCallback(
    (vote: Vote, index?: number) => {
      if (session) store.submitVote(session, vote, index).catch(warn);
    },
    [session],
  );
```

- [ ] **Step 5: Styles**

In the stylesheet found above add, next to the `participant-view` rules, minimal rules for `.collecting-view`, `.collecting-view__heading` (focus outline none, `outline: none` only for `:focus` on this non-interactive container), `.collecting-view__answer` (gap, wrap) and `.collecting-view__nav` (justify space-between), reusing the existing tokens and the `stack`, `inline wrap`, `actions` utilities. Keep the 320px layout free of horizontal scroll.

- [ ] **Step 6: Check and commit**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run` → clean (the facilitator `FacilitatorActions.submitVote` type is widened in Task 6; if `tsc` complains about it now, widen it here: `submitVote: (vote: Vote, index?: number) => void;` in `FacilitatorView.tsx`).

```bash
git commit -m "feat: add the participant stepper for async voting" -- src/components/CollectingView.tsx src/components/VotingPanel.tsx src/components/ParticipantView.tsx src/pages/SessionPage.tsx <stylesheet path> <FacilitatorView.tsx if touched>
```

---

### Task 6: Facilitator view

**Files:**
- Create: `src/components/facilitator/CollectingProgress.tsx`
- Modify: `src/components/facilitator/FacilitatorView.tsx`
- Modify: `src/components/facilitator/FacilitatorControls.tsx`
- Modify: `src/components/facilitator/ParticipantsPanel.tsx`
- Modify: `src/pages/SessionPage.tsx`
- Modify: the stylesheet (reuse `live-round` classes; add rules only if needed)

**Interfaces:**
- Consumes: `completedVoterCount`, `answeredCounts` (Task 1), `startMeeting` (Task 3), `CollectingView` (Task 5), `t.collecting.*`.
- Produces: `FacilitatorActions.startMeeting: () => void`; `CollectingProgress` with props `{ session: ClientSessionState }`, also used by the presenter in Task 7.

- [ ] **Step 1: `CollectingProgress`**

Create `src/components/facilitator/CollectingProgress.tsx`:

```tsx
import { Badge, BADGE_COLOR, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { completedVoterCount } from '../../lib/deriveClientState';
import { t } from '../../lib/i18n';

/** How far each voter got in an async session's voting window: names and counts only, never what they voted. */
function CollectingProgress({ session }: { session: ClientSessionState }) {
  const total = session.categories.length;
  return (
    <>
      <Text preset={TEXT_PRESET.paragraph} role="status">
        {t.collecting.participation(completedVoterCount(session), session.totalVoters)}
      </Text>
      <ul className="inline wrap live-round">
        {session.eligibleVoters.map((p) => {
          const n = session.answeredCounts[p.id] ?? 0;
          const complete = n >= total;
          return (
            <li key={p.id} className="live-round__item">
              <Badge
                className={`live-round__voter${complete ? ' live-round__voter--voted' : ''}`}
                color={complete ? BADGE_COLOR.success : BADGE_COLOR.neutral}
              >
                {complete && <Icon name={ICON_NAME.check} />}
                {p.id === session.facilitatorId && <Icon name={ICON_NAME.crown} />}
                <span aria-hidden="true">{`${p.name} ${n}/${total}`}</span>
                <span className="visually-hidden">{t.collecting.perPerson(p.name, n, total)}</span>
              </Badge>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default CollectingProgress;
```

- [ ] **Step 2: `FacilitatorControls`**

Import `CollectingProgress`. In `FacilitatorControls`, before `const action = ...`, add:

```ts
  const totalCategories = session.categories.length;
  const unfinished =
    phase === 'collecting'
      ? session.eligibleVoters
          .filter((p) => (session.answeredCounts[p.id] ?? 0) < totalCategories)
          .map((p) => p.name)
      : [];
```

Make `action` start with `phase === 'collecting' ? { label: t.collecting.start, onClick: actions.startMeeting, icon: ICON_NAME.arrowRight } : phase === 'lobby' ? …` (turn the existing chain's first test into the `else` branch). In the card, add before the `intro` hint:

```tsx
      {phase === 'collecting' && <CollectingProgress session={session} />}
      {unfinished.length > 0 && (
        <Text preset={TEXT_PRESET.caption}>{t.collecting.startWarning(unfinished.join(', '))}</Text>
      )}
```

- [ ] **Step 3: `FacilitatorView`**

Add `startMeeting: () => void;` to `FacilitatorActions` and widen `submitVote: (vote: Vote, index?: number) => void;`. Import `CollectingView`. In `main`, add after the `lobby` block:

```tsx
      {phase === 'collecting' && (
        <>
          <Card className="card-body facilitator-view__share" color={CARD_COLOR.neutral}>
            <Text preset={TEXT_PRESET.paragraph}>{t.collecting.shareHint}</Text>
            <SharePanel code={session.code} />
          </Card>
          {session.facilitatorVotes && (
            <Card className="card-body facilitator-view__collecting" color={CARD_COLOR.neutral}>
              <CollectingView session={session} onSubmitVote={actions.submitVote} />
            </Card>
          )}
        </>
      )}
```

Show the presenter hint in `collecting` too: change `phase === 'lobby' && showHint` to `(phase === 'lobby' || phase === 'collecting') && showHint`.

- [ ] **Step 4: `ParticipantsPanel`**

After the vote-mode line add `{' · '}{t.settings.votingTime}: {t.settings.modes[session.mode]}`.

- [ ] **Step 5: `SessionPage`**

In `facilitatorActions` add `startMeeting: () => void store.startMeeting(session).catch(warn),`.

- [ ] **Step 6: Check and commit**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run` → clean.
Read `src/components/facilitator/LiveRound.tsx` once more: in an async `revealed` round `voterIds` is the category's voters and `readyIds` still drive the badges, so it works unchanged; confirm in the browser run of Task 7.

```bash
git commit -m "feat: add the facilitator's voting window for async sessions" -- src/components/facilitator src/pages/SessionPage.tsx <stylesheet path if touched>
```

---

### Task 7: Presenter waiting screen and end-to-end script

**Files:**
- Modify: `src/components/PresenterView.tsx`
- Create: `scripts/workshop-async.mjs`
- Modify: `package.json` (script `workshop:async`)

**Interfaces:**
- Consumes: `CollectingProgress` (Task 6), `t.collecting.presenterTitle`.

- [ ] **Step 1: Presenter**

In `PresenterView.tsx` import `CollectingProgress from './facilitator/CollectingProgress'`. After the `lobby` block add:

```tsx
  if (phase === 'collecting') {
    return (
      <div className="page page-narrow presenter-view presenter-view--collecting">
        <Card className="card-body presenter-view__lobby" color={CARD_COLOR.neutral}>
          <Text preset={TEXT_PRESET.heading2} as="h2" className="presenter-view__join-title">
            {t.collecting.presenterTitle}
          </Text>
          <SharePanel code={session.code} />
          <CollectingProgress session={session} />
        </Card>
      </div>
    );
  }
```

- [ ] **Step 2: Class suffix for the phase helper**

`scripts/workshop.mjs` finds the phase from the class suffix list `(lobby|intro|voting|revealed|finished)`. The new script defines its own helper including `collecting`.

- [ ] **Step 3: `scripts/workshop-async.mjs`**

Create a self-contained script modelled on `scripts/workshop.mjs` (copy its header comment pattern, `newAgent`, `watch`, `axe`, `shot`, `log`, `issue`, `sleep`, `expectEnabled` and the final summary block; do not import from it, it runs at module level). Scenario, with a facilitator `Léa` (votes), a presenter popup, and two participants `Alice` (phone, EN) and `Bruno` (desktop, FR locale):

1. Facilitator: home → **Create Session** → click the toggle labelled `Asynchronous voting` (`getByRole('switch', { name: /Asynchronous voting/ })` or `getByLabel`, whichever resolves; assert the "Time per category" field is gone) → **Start Session** → read the code → join as `Léa` → wait for `.facilitator-view--collecting`. Run `axe('Facilitator', fp, 'facilitator-collecting')`.
2. Presenter: open via `.facilitator-view__presenter-hint .open-presenter-button`; wait for `.presenter-view--collecting`; run axe.
3. Alice and Bruno open `${BASE}#/session/${code}`, join, wait for `.participant-view--collecting`. Alice: axe on the mobile stepper (`participant-collecting-mobile`) and check there is no horizontal scroll at 375px (same check as `workshop.mjs`).
4. For each category, Alice picks a color and a trend with the same selectors as `vote()` in `workshop.mjs` (`form.voting-panel`, `.voting-panel__field--color label:has(input[value=…])`, `.voting-panel__field--trend label:has(input[value=…])`, `button[type="submit"]`); after each save, assert focus is inside `.collecting-view__heading` and that a `[role="status"]` contains `Vote saved`. Bruno votes only the first two categories, then reloads the page and asserts the stepper shows `.voting-panel` pre-filled (the first checked input equals what he chose) and that no name prompt appears. Léa (facilitator) votes all categories through the same stepper.
5. Facilitator: assert `.facilitator-controls` shows Léa and Alice complete and Bruno incomplete (`n/total` text) and the warning text `Not finished: Bruno`; run axe on the review step of Alice (`.collecting-view--review`) and then click **Start the meeting**.
6. Assert `.facilitator-view--revealed` and `.presenter-view--revealed` appear at once with the matrix (`.vote-matrix`), the totals match between the two views, and Alice's page shows `.participant-view--revealed`. Assert no ⚡ anywhere (`page.getByText('⚡')` count 0 on the facilitator view).
7. Facilitator clicks **Next Category** until the last one (assert each goes straight to `.facilitator-view--revealed`, never `--voting`), then **Finish Session**; assert `.facilitator-view--finished`; download the three reports like `workshop.mjs` does.
8. A late participant `Dana` joins after the meeting started: assert her page shows `Voting is closed` and has no `form.voting-panel`.
9. Write `summary.json` and set `process.exitCode` exactly as `workshop.mjs` does.

Add to `package.json` scripts: `"workshop:async": "node scripts/workshop-async.mjs"`.

- [ ] **Step 4: Run it**

Run (two terminals): `npm run dev`, then `npm run workshop:async`.
Expected: `0 issue(s)`, exit code 0. Fix any app bug it reveals in the owning task's files and re-run; do not weaken an assertion to make it pass. Note: the script needs the Task 2 rules published to the live database, so publish them first (Task 8, Step 1) or run against a Firebase emulator if you have one.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: show the presenter a waiting screen while votes are collected, and test async sessions end to end" -- src/components/PresenterView.tsx scripts/workshop-async.mjs package.json
```

---

### Task 8: Publish the rules, document, final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Publish and check the rules** (as `CLAUDE.md` requires, before any push)

```bash
npx -y firebase-tools@latest database:set /.settings/rules database.rules.json \
  --project feoche-squad-health-check --instance feoche-squad-health-check-default-rtdb --force

npx -y firebase-tools@latest database:get /.settings/rules \
  --project feoche-squad-health-check --instance feoche-squad-health-check-default-rtdb \
  | python3 -c "import json,sys;print('IDENTICAL' if json.load(sys.stdin)==json.load(open('database.rules.json')) else 'DIFFERENT')"
```

Expected: `IDENTICAL`. This changes the live database: ask the user for a go-ahead before running the first command if they have not already given one for this feature.

- [ ] **Step 2: README**

Add to the "Votes and results" table a row: `| 🕐 **Asynchronous voting** | Chosen at creation (a switch): the session code is sent before the meeting, everyone votes on every category on their own time (a stepper, editable until the facilitator starts the meeting), the facilitator only sees who has voted how far, never the results. Starting the meeting closes voting for good and opens the results of the first category; the meeting is then spent on each category's results 🔒 |`. Add a short "Asynchronous sessions" subsection under "How to Use" with the flow `Create (switch on) → send the code → team votes → Start the meeting → results per category → finish`. Add test 22 to the manual checklist, after test 21:

`22. Asynchronous session: create with **Asynchronous voting** on (the time per category field is gone); A lands on the voting window and sees the share panel; B joins and votes some categories with the stepper, reloads → the answers are kept and editable; A sees *Not finished: B*; presenter shows *Voting is open*; A clicks **Start the meeting** → every screen shows category 1's results at once, no ⚡; **Next Category** goes straight to the next results; C joins now → *Voting is closed*, no form. Rules Playground: *write* `true` at `/sessions/<CODE>/voters/2/<B's UID>` as B while collecting → *Allowed*, after the start → *Denied*; as B in a live session → *Denied*; *write* `'live'` at `/sessions/<CODE>/state/mode` as A → *Denied*; *write* `'collecting'` at `/sessions/<CODE>/state/phase` as A once revealed → *Denied*; read `/sessions/<CODE>/votes/0` as A while collecting → *Denied*.`

- [ ] **Step 3: Full verification**

Run: `npx vitest run && npm run build` → all tests pass and the build succeeds. Run the live regression: `npm run workshop` (the existing live scenario) → `0 issue(s)`, proving live sessions still work with the new rules. Run `npm run workshop:async` → `0 issue(s)`.
Run the PDF check from `CLAUDE.md` on an async report generated by the script (`docker run --rm -v "$PWD":/data verapdf/cli --flavour ua1 --format text /data/<file>.pdf`), using the PDF in `workshop-report/` → compliant.

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: document asynchronous voting" -- README.md
```

---

## Self-review

- **Spec coverage:** mode and phase in types, derive, rules (Tasks 1, 2); lifecycle and no lobby (Tasks 1, 3); stepper and review (5); facilitator participation and Start the meeting (6); presenter waiting screen (7); immediate reveal and Next Category (3); late voters blocked (2, 5); offline votes unchanged (existing rule, noted in the spec); accessibility (focus, `role="status"`, bilingual strings, axe in 7); testing (1, 7, 8); ODS switch (4).
- **Placeholder scan:** none; the stylesheet path and the optional fixture files are resolved with a `grep`/`tsc` instruction at run time, as they are not known in advance.
- **Type consistency:** `mode`, `answeredCounts`, `myVotedIndexes`, `myVotes`, `completedVoterCount`, `startMeeting`, `submitVote(s, vote, index?)`, `CollectingProgress`, `t.collecting.*` and `t.settings.{asyncVoting,asyncVotingHint,votingTime,modes}` are named identically wherever they appear.

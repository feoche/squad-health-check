# Live Session Cap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow at most 5 sessions active at the same time on the author's Firebase backend, enforced by the database rules, with a clear message when the limit is reached.

**Architecture:** Five fixed slots at `/liveSlots/0..4`, each naming the session that holds it. Rules accept a slot write only together with the metadata of the new session that takes it, and only when the slot is empty, its holder is finished or deleted, or its holder is older than 12 hours. A pure helper `freeLiveSlots` mirrors those conditions in the app; `createSession` claims a slot and the session in one atomic multi-path update.

**Tech Stack:** React 18, TypeScript, Firebase Realtime Database (rules in `database.rules.json`), Vitest.

**Spec:** `docs/specs/2026-10-14-live-session-cap-design.md`

## Global Constraints

- Every session counts, live or async. A slot frees when its session is `finished`, or 12 hours (`43200000` ms) after `meta/createdAt`.
- Cap is **5**: slots `0..4`. The rules hard-code the slot regex and the lease; the app has `MAX_LIVE_SESSIONS` and `LIVE_SLOT_LEASE_MS`; a unit test keeps them in step.
- Existing sessions (no `liveSlot`) are not counted and keep working: `meta` is never rewritten (`!data.exists()`).
- No server, no Cloud Function, no Firebase emulator: unit tests only for code.
- Messages exist in English and French: `fr` is typed as the English `Messages`, so a missing key fails `tsc`.
- `database.rules.json` is **not** deployed by CI. Publish it and check it is identical **before** pushing the app to `main` (commands in `CLAUDE.md`, run in Task 4).
- Commits: no `Co-Authored-By`, no tool paths, no `.claude` files; commit only the paths of the task (`git commit -m "..." -- <paths>`), because the user stages work in parallel (check `git status` first); do not push unless the user asks.
- Run `npx vitest run` and `npx tsc -p tsconfig.json --noEmit` before each commit; a task is not done with either failing.

## Review Focus

- Firebase returns a dense `liveSlots` (keys `0,1,2…`) as an **array**, with `null` for holes: `freeLiveSlots` must read both shapes. Task 1 test.
- A holder created exactly 12 hours ago is still busy (the rules use a strict `<`). Task 1 test.
- Two creators racing for the last free slot: exactly one wins, the other is refused and gets the "limit reached" message instead of a generic error. Task 3 loop, Task 4 script.
- A finished session's slot is reusable at once, with no cleanup. Task 4 script.
- Browser clock far from the server's: the app may think a slot is free while the rules refuse it. The create loop rotates over the free slots and stops after `MAX_CODE_ATTEMPTS` with the existing "Could not create a session" message rather than looping forever. Task 3.
- A deleted holder (condition 3) cannot be produced on the live database, since sessions are only deletable after six months. It is covered by reading the rule, not by the manual check. Task 3 corrects the spec, which claimed otherwise.

---

### Task 1: `freeLiveSlots` and the constants

**Files:**
- Create: `src/lib/liveSessionSlots.ts`
- Test: `src/lib/liveSessionSlots.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2 and 3):
  - `MAX_LIVE_SESSIONS = 5`, `LIVE_SLOT_LEASE_MS = 43_200_000`
  - `type LiveSlots = Record<string, { code?: string } | null> | null`
  - `interface LiveHolder { phase?: string; createdAt: number }`
  - `freeLiveSlots(slots: LiveSlots, holders: Record<string, LiveHolder | undefined>, now: number): number[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/liveSessionSlots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LIVE_SLOT_LEASE_MS, MAX_LIVE_SESSIONS, freeLiveSlots } from './liveSessionSlots';

const NOW = 1_000_000_000_000;
const recent = { createdAt: NOW - 60_000 };

describe('freeLiveSlots', () => {
  it('offers every slot when none is taken', () => {
    expect(freeLiveSlots(null, {}, NOW)).toEqual([0, 1, 2, 3, 4]);
    expect(freeLiveSlots({}, {}, NOW)).toHaveLength(MAX_LIVE_SESSIONS);
  });

  it('skips a slot held by a running session', () => {
    expect(freeLiveSlots({ 1: { code: 'AAAAAA' } }, { AAAAAA: recent }, NOW)).toEqual([0, 2, 3, 4]);
  });

  it('frees a slot whose session is finished', () => {
    const holders = { AAAAAA: { ...recent, phase: 'finished' } };
    expect(freeLiveSlots({ 0: { code: 'AAAAAA' } }, holders, NOW)).toContain(0);
  });

  it('frees a slot whose session no longer exists', () => {
    expect(freeLiveSlots({ 0: { code: 'AAAAAA' } }, { AAAAAA: undefined }, NOW)).toContain(0);
  });

  it('frees a slot once its session is older than the lease, not before', () => {
    const slots = { 0: { code: 'AAAAAA' } };
    const atLease = { AAAAAA: { createdAt: NOW - LIVE_SLOT_LEASE_MS } };
    const pastLease = { AAAAAA: { createdAt: NOW - LIVE_SLOT_LEASE_MS - 1 } };
    expect(freeLiveSlots(slots, atLease, NOW)).not.toContain(0);
    expect(freeLiveSlots(slots, pastLease, NOW)).toContain(0);
  });

  it('is empty once every slot is held by a running session', () => {
    const slots = Object.fromEntries(
      Array.from({ length: MAX_LIVE_SESSIONS }, (_, i) => [i, { code: `CODE${i}0` }]),
    );
    const holders = Object.fromEntries(Object.values(slots).map((s) => [s.code, recent]));
    expect(freeLiveSlots(slots, holders, NOW)).toEqual([]);
  });

  it('reads the array Firebase returns for consecutive keys, with null holes', () => {
    const slots = [{ code: 'AAAAAA' }, null, { code: 'BBBBBB' }];
    const holders = { AAAAAA: recent, BBBBBB: recent };
    expect(freeLiveSlots(slots as never, holders, NOW)).toEqual([1, 3, 4]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/liveSessionSlots.test.ts`
Expected: FAIL, `Failed to resolve import "./liveSessionSlots"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/liveSessionSlots.ts`:

```ts
/** Sessions that can be active at once. Enforced in database.rules.json by slots 0–4. */
export const MAX_LIVE_SESSIONS = 5;

/** A session keeps its slot at most this long. Same duration is enforced in database.rules.json. */
export const LIVE_SLOT_LEASE_MS = 12 * 60 * 60 * 1000;

/**
 * `/liveSlots` as Firebase returns it: an object, or an array with null holes when the keys
 * are consecutive from 0. Indexing by string works for both.
 */
export type LiveSlots = Record<string, { code?: string } | null> | null;

/** What the rules read on the session holding a slot */
export interface LiveHolder {
  phase?: string;
  createdAt: number;
}

/**
 * Free slot numbers, in order. Mirrors the rules: a slot is free when it is empty, when its
 * holder is missing or finished, or when the holder was created more than the lease ago.
 * `holders` is by session code; a missing session is undefined.
 */
export function freeLiveSlots(
  slots: LiveSlots,
  holders: Record<string, LiveHolder | undefined>,
  now: number,
): number[] {
  return Array.from({ length: MAX_LIVE_SESSIONS }, (_, i) => i).filter((i) => {
    const code = slots?.[String(i)]?.code;
    if (!code) return true;
    const holder = holders[code];
    if (!holder || holder.phase === 'finished') return true;
    return holder.createdAt < now - LIVE_SLOT_LEASE_MS;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/liveSessionSlots.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git status --short
npx tsc -p tsconfig.json --noEmit && npx vitest run
git add src/lib/liveSessionSlots.ts src/lib/liveSessionSlots.test.ts
git commit -m "feat: pick a free live session slot" -- src/lib/liveSessionSlots.ts src/lib/liveSessionSlots.test.ts
```

---

### Task 2: Rules for the slots, and the test that keeps them in step

**Files:**
- Modify: `database.rules.json` (new `liveSlots` node; `sessions.$code.meta`)
- Test: `src/lib/liveSessionSlots.rules.test.ts`

**Interfaces:**
- Consumes: `MAX_LIVE_SESSIONS`, `LIVE_SLOT_LEASE_MS` from Task 1.
- Produces: the rules Task 3's `createSession` writes against: slot path `liveSlots/{n}` = `{ code }`, and `meta.liveSlot` = `n`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/liveSessionSlots.rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import rules from '../../database.rules.json';
import { LIVE_SLOT_LEASE_MS, MAX_LIVE_SESSIONS } from './liveSessionSlots';

const root = rules.rules as Record<string, any>;
const slot = root.liveSlots?.$n;
const meta = root.sessions.$code.meta;

describe('live session cap in database.rules.json', () => {
  it('has as many slots as the app expects', () => {
    expect(slot['.write']).toContain(`/^[0-${MAX_LIVE_SESSIONS - 1}]$/`);
    expect(meta.liveSlot['.validate']).toContain(`newData.val() <= ${MAX_LIVE_SESSIONS - 1}`);
  });

  it('uses the same lease as the app', () => {
    expect(slot['.write']).toContain(`now - ${LIVE_SLOT_LEASE_MS}`);
  });

  it('takes a slot only together with the metadata of the new session', () => {
    expect(slot['.write']).toContain("/meta/facilitatorId').val() === auth.uid");
    expect(slot['.write']).toContain("/meta/liveSlot').val() + '' === $n");
    expect(meta['.write']).toContain("child('liveSlots/' + newData.child('liveSlot').val() + '/code').val() === $code");
  });

  it('frees a slot for a finished, deleted or expired holder', () => {
    const w: string = slot['.write'];
    expect(w).toContain("/state/phase').val() === 'finished'");
    expect(w).toContain("!root.child('sessions/' + data.child('code').val() + '/meta').exists()");
    expect(w).toContain("/meta/createdAt').val() < now");
  });

  it('requires the session metadata to name its slot and the server time', () => {
    expect(meta['.validate']).toContain("'liveSlot'");
    expect(meta.createdAt['.validate']).toBe('newData.val() === now');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/liveSessionSlots.rules.test.ts`
Expected: FAIL, `Cannot read properties of undefined` on `slot` (no `liveSlots` node yet).

- [ ] **Step 3: Edit the rules**

In `database.rules.json`, make three edits.

1. Add the `liveSlots` node as a sibling of `sessions`, before it (`"rules": { "liveSlots": {…}, "sessions": {…} }`):

```json
"liveSlots": {
  ".read": "auth != null",
  "$n": {
    ".write": "auth != null && $n.matches(/^[0-4]$/) && newData.exists() && newData.parent().parent().child('sessions/' + newData.child('code').val() + '/meta/facilitatorId').val() === auth.uid && newData.parent().parent().child('sessions/' + newData.child('code').val() + '/meta/liveSlot').val() + '' === $n && (!data.exists() || !root.child('sessions/' + data.child('code').val() + '/meta').exists() || root.child('sessions/' + data.child('code').val() + '/state/phase').val() === 'finished' || root.child('sessions/' + data.child('code').val() + '/meta/createdAt').val() < now - 43200000)",
    ".validate": "newData.hasChildren(['code']) && newData.child('code').isString() && newData.child('code').val().matches(/^[A-Z2-9]{6}$/)",
    "code": { ".validate": "newData.isString()" },
    "$other": { ".validate": false }
  }
},
```

2. In `sessions.$code.meta`, replace the `.write` and `.validate` and the field validations:

```json
".write": "auth != null && !data.exists() && $code.matches(/^[A-Z2-9]{6}$/) && newData.child('facilitatorId').val() === auth.uid && newData.parent().parent().parent().child('liveSlots/' + newData.child('liveSlot').val() + '/code').val() === $code",
".validate": "newData.hasChildren(['facilitatorId', 'categories', 'createdAt', 'liveSlot'])",
"facilitatorId": { ".validate": "newData.isString()" },
"categories": { ".validate": "newData.hasChildren()" },
"createdAt": { ".validate": "newData.val() === now" },
"liveSlot": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 4 && newData.val() % 1 === 0" },
"$other": { ".validate": false }
```

3. Check the file is valid JSON: `python3 -c "import json;json.load(open('database.rules.json'))"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/liveSessionSlots.rules.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

Do **not** publish the rules yet: the app still creates sessions without a slot (Task 3), so publishing now would break creation. Task 4 publishes.

```bash
git status --short
npx tsc -p tsconfig.json --noEmit && npx vitest run
git add database.rules.json src/lib/liveSessionSlots.rules.test.ts
git commit -m "feat: cap live sessions with five slots in the database rules" -- database.rules.json src/lib/liveSessionSlots.rules.test.ts
```

---

### Task 3: Claim a slot when creating a session, and say so when full

**Files:**
- Modify: `src/lib/sessionStore.ts` (imports; new helpers; `createSession`, currently lines 86-117)
- Modify: `src/lib/i18n.ts` (`errors` in both languages, lines 443-448 and 833-838)
- Modify: `README.md` (features table, after the Asynchronous voting row)
- Modify: `docs/specs/2026-10-14-live-session-cap-design.md` (two statements to correct)

**Interfaces:**
- Consumes: `MAX_LIVE_SESSIONS`, `freeLiveSlots`, `LiveSlots`, `LiveHolder` (Task 1); the rules of Task 2 (`liveSlots/{n}` = `{ code }`, `meta.liveSlot`).
- Produces: `t.errors.liveSessionsFull(max: number): string`; `createSession(categories, settings): Promise<string>` keeps its signature.

- [ ] **Step 1: Add the message in both languages**

In `src/lib/i18n.ts`, English `errors` (after `sessionFull`):

```ts
    liveSessionsFull: (max: number) => `${max} sessions are already running. Try again in a while.`,
```

French `errors` (after `sessionFull`):

```ts
    liveSessionsFull: (max) => `${max} sessions sont déjà en cours. Réessayez dans un moment.`,
```

Run `npx tsc -p tsconfig.json --noEmit`. Expected: no errors (the French object is typed as `Messages`, so a missing key would fail here).

- [ ] **Step 2: Write the new `createSession`**

In `src/lib/sessionStore.ts`, add to the imports:

```ts
import { MAX_LIVE_SESSIONS, LiveHolder, LiveSlots, freeLiveSlots } from './liveSessionSlots';
```

Replace `createSession` (and add the helpers just above it, after `removeExpiredSession`):

```ts
/** Server clock, so the lease is judged like the rules judge it (one read, not a subscription) */
const readServerOffset = () =>
  new Promise<number>((resolve, reject) =>
    onValue(
      ref(getDb(), '.info/serverTimeOffset'),
      (snap) => resolve(Number(snap.val()) || 0),
      reject,
      { onlyOnce: true },
    ),
  );

/** Slots a new session could take right now: the slots, their holders' state, the server time */
async function readFreeLiveSlots(): Promise<number[]> {
  const slots = (await get(ref(getDb(), 'liveSlots'))).val() as LiveSlots;
  const codes = Object.values(slots ?? {}).flatMap((s) => (s?.code ? [s.code] : []));
  const holders: Record<string, LiveHolder | undefined> = {};
  await Promise.all(
    codes.map(async (code) => {
      const [createdAt, phase] = await Promise.all([
        get(sessionRef(code, 'meta/createdAt')),
        get(sessionRef(code, 'state/phase')),
      ]);
      holders[code] = createdAt.exists()
        ? { createdAt: createdAt.val() as number, phase: (phase.val() as string | null) ?? undefined }
        : undefined;
    }),
  );
  return freeLiveSlots(slots, holders, Date.now() + (await readServerOffset()));
}

/**
 * Creates the session in one of the free live slots, in a single atomic update: the rules refuse
 * the session without the slot, and the slot without the session. A denied write means a taken
 * code or a slot taken first, so the slots are read again before the next attempt.
 */
export async function createSession(categories: Category[], settings: SessionSettings): Promise<string> {
  const uid = await ensureSignedIn();
  const write = (code: string, slot: number) =>
    update(ref(getDb()), {
      [`liveSlots/${slot}`]: { code },
      [`sessions/${code}/meta`]: {
        facilitatorId: uid,
        categories: toFirebaseCategories(categories),
        createdAt: serverTimestamp(),
        liveSlot: slot,
      },
      [`sessions/${code}/state`]: {
        phase: settings.mode === 'async' ? 'collecting' : 'lobby',
        currentCategoryIndex: 0,
        ...settings,
      },
    });
  const full = () => new AppError(() => t.errors.liveSessionsFull(MAX_LIVE_SESSIONS));
  let free = await readFreeLiveSlots();
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    if (free.length === 0) throw full();
    const slot = free[attempt % free.length];
    const code = generateSessionCode();
    try {
      await write(code, slot);
      return code;
    } catch (err) {
      /* Rules deny a taken code or a slot taken first */
      if (!isPermissionDenied(err)) throw err;
    }
    /* The session holding this code may have expired: delete it and take its code */
    if (await removeExpiredSession(code)) {
      try {
        await write(code, slot);
        return code;
      } catch (err) {
        if (!isPermissionDenied(err)) throw err;
      }
    }
    free = await readFreeLiveSlots();
  }
  if (free.length === 0) throw full();
  throw new AppError(() => t.errors.createFailed);
}
```

Check what you replaced: the old function used `update(sessionRef(code), { meta, state })`; the `state` object is unchanged, only now written through a root-level multi-path update. Keep `MAX_CODE_ATTEMPTS`, `isPermissionDenied`, `removeExpiredSession`, `generateSessionCode` as they are.

- [ ] **Step 3: Type-check and run the tests**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run`
Expected: no type errors; all tests pass (the new ones from Tasks 1 and 2 included).

- [ ] **Step 4: Update the README and correct the spec**

README, in the features table, after the `🕐 **Asynchronous voting**` row add:

```
| 🚦 **Live session cap** | At most 5 sessions can be active at once (live or async), enforced by the database rules with five slots; a slot frees when its session finishes, or 12 hours after creation. Creating a 6th shows *5 sessions are already running* |
```

In `docs/specs/2026-10-14-live-session-cap-design.md`, section **Verification**:

- Replace `the new message in both languages (the existing i18n test checks both languages have the same keys)` with `the new message in both languages (the French messages are typed as the English ones, so a missing key fails \`tsc\`)`.
- Replace the sentence `The expectation that comparing a missing holder behaves as "free" (condition 3) is part of this check.` with `Condition 3 (a deleted holder) cannot be produced on the live database, since sessions are only deletable after six months: it rests on reading the rule.`

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/lib/sessionStore.ts src/lib/i18n.ts README.md docs/specs/2026-10-14-live-session-cap-design.md
git commit -m "feat: claim a live session slot when creating a session" -- src/lib/sessionStore.ts src/lib/i18n.ts README.md docs/specs/2026-10-14-live-session-cap-design.md
```

---

### Task 4: Publish the rules, verify them live, then push

This task writes to the live database. **Ask the user before step 2** and do not push without their request.

**Files:**
- Create then delete: `tmp-live-cap-check.mjs` (project root, not committed)

**Interfaces:**
- Consumes: the rules (Task 2) and the update shape of `createSession` (Task 3).
- Produces: a live database whose rules match the repo; a pass/fail report.

- [ ] **Step 1: Run every check**

Run: `npx tsc -p tsconfig.json --noEmit && npx vitest run && npx vite build`
Expected: no type errors, all tests pass, build succeeds.

- [ ] **Step 2: Get the user's agreement**

Say: "The check creates 5 to 7 throwaway sessions on your live database, then finishes them all so no slot stays held. It needs the new rules published first, which stops the old deployed app from creating sessions until it is redeployed. OK to go ahead?" Wait for a yes.

- [ ] **Step 3: Publish the rules and check they are identical**

Run the two commands of `CLAUDE.md` › Firebase rules.
Expected: the second prints `IDENTICAL`.

- [ ] **Step 4: Write and run the check script**

Create `tmp-live-cap-check.mjs`:

```js
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { get, getDatabase, ref, serverTimestamp, update } from 'firebase/database';

const config = Object.fromEntries(
  [...fs.readFileSync('src/lib/firebaseConfig.ts', 'utf8').matchAll(/(\w+): '([^']*)'/g)].map((m) => [m[1], m[2]]),
);
const app = initializeApp(config);
const { user } = await signInAnonymously(getAuth(app));
const db = getDatabase(app);
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const created = [];
const create = async (slot) => {
  const code = randomCode();
  await update(ref(db), {
    [`liveSlots/${slot}`]: { code },
    [`sessions/${code}/meta`]: {
      facilitatorId: user.uid,
      categories: [{ name: 'Check', positiveDescription: 'p', negativeDescription: 'n' }],
      createdAt: serverTimestamp(),
      liveSlot: slot,
    },
    [`sessions/${code}/state`]: {
      phase: 'lobby', currentCategoryIndex: 0, mode: 'live', voteMode: 'colors',
      anonymity: 'off', facilitatorVotes: true, categoryMinutes: 10,
    },
  });
  created.push(code);
  return code;
};
const outcome = (p) => p.then(() => 'ok', (e) => (/permission.denied/i.test(e.message) ? 'denied' : `error: ${e.message}`));
const finish = (code) => update(ref(db), { [`sessions/${code}/state/phase`]: 'finished' });

const report = [];
let failed = false;
const check = (name, actual, expected) => report.push({ name, pass: actual === expected, actual, expected });

try {
  if ((await get(ref(db, 'liveSlots'))).exists()) throw new Error('liveSlots is not empty: stop, a real session may be running');
  for (let slot = 0; slot < 4; slot++) check(`slot ${slot} free`, await outcome(create(slot)), 'ok');
  const race = await Promise.all([outcome(create(4)), outcome(create(4))]);
  check('two creators race for the last slot: one wins', race.filter((r) => r === 'ok').length, 1);
  check('two creators race for the last slot: one is denied', race.filter((r) => r === 'denied').length, 1);
  for (let slot = 0; slot < 5; slot++) check(`slot ${slot} refused while held`, await outcome(create(slot)), 'denied');
  const noSlot = randomCode();
  check('a session without a slot is refused', await outcome(update(ref(db), {
    [`sessions/${noSlot}/meta`]: { facilitatorId: user.uid, categories: [{ name: 'c', positiveDescription: 'p', negativeDescription: 'n' }], createdAt: serverTimestamp(), liveSlot: 0 },
    [`sessions/${noSlot}/state`]: { phase: 'lobby', currentCategoryIndex: 0 },
  })), 'denied');
  await finish(created[2]);
  check('a finished session frees its slot at once', await outcome(create(2)), 'ok');
} catch (err) {
  failed = true;
  console.error(err.message);
} finally {
  for (const code of created) await finish(code).catch(() => {});
  console.table(report);
  const pass = !failed && report.length > 0 && report.every((r) => r.pass);
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
}
```

Run: `node tmp-live-cap-check.mjs`
Expected: every row `pass: true`, last line `PASS`. If the first check aborts because `liveSlots` is not empty, a real session may be running: report it to the user and do not continue.

- [ ] **Step 5: Free the slots, clean up, report**

The script's `finally` finished every session it created, which frees their slots by rule (a finished holder is free), so nothing needs deleting. Then:

```bash
rm tmp-live-cap-check.mjs
git status --short
```

Expected: the working tree shows only the user's own files. Report the table to the user. If any row failed, do not push; report which row and stop.

- [ ] **Step 6: Push only on request**

Tell the user the rules are live and the app is not yet deployed (the old deployed app cannot create sessions until it is), and that pushing `main` deploys it. Run `git push origin main` only when they ask.

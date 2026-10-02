# Firebase Realtime Sessions Implementation Plan

Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Express + Socket.io backend with Firebase Realtime Database + Anonymous Auth so the app runs entirely from GitHub Pages.

**Architecture:** A single module (`src/lib/sessionStore.ts`) owns all Firebase access. It listens to the session's children and rebuilds the existing `ClientSessionState` through a pure function (`deriveClientState`), so the React components keep their current props. Permissions (facilitator-only controls, hidden votes during a round) are enforced by `database.rules.json`.

**Tech Stack:** React 18, TypeScript, Vite 5, Firebase JS SDK 12 (`firebase/app`, `firebase/auth`, `firebase/database`), Vitest 3, GitHub Actions → GitHub Pages.

**Spec:** `docs/specs/2026-10-02-firebase-realtime-design.md`

## Global Constraints

- Hosting: GitHub Pages, static only; repo `git@github.com:feoche/squad-health-check.git`, branch `main`.
- Firebase free (Spark) plan only: Realtime Database + Anonymous Auth. No Cloud Functions.
- Session code: 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Vote keys: 20 random chars from `crypto.getRandomValues`, never Firebase push ids.
- Router: `HashRouter`; Vite `base: './'`.
- Tests: Vitest unit tests only (no emulator).
- Commits: plain, descriptive messages.
- Participant name: 1–50 chars. Notes: ≤ 5000 chars.

## Review Focus

1. **RTDB returns integer-keyed objects as sparse arrays** (`voters`, `votes`, `notes` are keyed `0..n`) — `deriveClientState` must read them identically whether they arrive as objects or arrays with `null` holes. Pinned in Task 2.
2. **Undefined optional fields** — a category without `nameFr` has `nameFr: undefined` after editing; Firebase rejects `undefined` and session creation would fail. Pinned in Task 1 (`toFirebaseCategories`).
3. **Listening to `votes/{current}` while voting** — the rules deny that read, and Firebase *cancels* the listener; results would then never appear. Only attach for indexes returned by `readableVoteIndexes`. Pinned in Task 2.
4. **Auto-reveal with zero participants / not facilitator** — must not fire when nobody joined yet, nor from a participant's tab. Pinned in Task 2 (`shouldAutoReveal`).
5. **Reload / rejoin** — reloading a tab must land back in the session with the same identity (facilitator stays facilitator) without re-entering a name. Covered by the anonymous uid + `getParticipantName` check in Task 5 and the manual checklist in Task 7.

Known limitation (accepted, documented in README): Firebase rules cannot count children, so a participant crafting a multi-path write in devtools could add more than one vote in a single round. The UI shows "Results (N votes)", which makes this visible.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/lib/sessionCode.ts` | Create | Random session codes and vote keys |
| `src/lib/serialize.ts` | Create | Strip unset optional fields before writing to Firebase |
| `src/lib/deriveClientState.ts` | Create | Pure: raw RTDB data → `ClientSessionState`; `readableVoteIndexes`; `shouldAutoReveal` |
| `src/lib/firebaseConfig.ts` | Create | Public Firebase web config (committed) |
| `src/lib/firebase.ts` | Create | Lazy app/auth/db init, `ensureSignedIn` |
| `src/lib/sessionStore.ts` | Create | All reads/writes/listeners; the only Firebase-aware module used by pages |
| `database.rules.json` | Create | Security rules |
| `src/types.ts` | Modify | Add `myId`, `facilitatorId` to `ClientSessionState` |
| `src/pages/CreateSession.tsx` | Modify | Use `createSession` |
| `src/pages/SessionPage.tsx` | Modify | Use `sessionStore`; auto-reveal; reconnect banner |
| `src/components/Lobby.tsx` | Modify | `myId`/`facilitatorId` from state; hash share URL |
| `src/components/ResultsGrid.tsx` | Modify | `maxLength={5000}` on notes |
| `src/main.tsx`, `src/App.tsx` | Modify | `HashRouter`, `<Link>` |
| `src/styles/main.css` | Modify | `.connection-banner` |
| `vite.config.ts`, `package.json` | Modify | Vitest, `base`, scripts, deps |
| `.github/workflows/deploy.yml` | Create | Build + deploy to Pages |
| `README.md` | Modify | Firebase setup, deploy, manual checklist |
| `server/`, `Dockerfile`, `src/hooks/useNetworkOrigin.ts` | Delete | Obsolete |

---

### Task 1: Test tooling, session codes and category serialization

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `src/lib/sessionCode.ts`, `src/lib/serialize.ts`
- Test: `src/lib/sessionCode.test.ts`, `src/lib/serialize.test.ts`

**Interfaces:**
- Produces: `generateSessionCode(): string`, `randomKey(): string`, `CODE_PATTERN: RegExp` (from `sessionCode.ts`); `toFirebaseCategories(categories: Category[]): Category[]` (from `serialize.ts`).

- [ ] **Step 1: Install Vitest and add the test script**

```bash
npm install --save-dev vitest@^3.2.0
npm pkg set scripts.test="vitest run"
```

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

Replace the file with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Write the failing tests**

`src/lib/sessionCode.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateSessionCode, randomKey, CODE_PATTERN } from './sessionCode';

describe('generateSessionCode', () => {
  it('returns 6 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateSessionCode()).toMatch(CODE_PATTERN);
    }
  });

  it('never contains I, O, 0 or 1', () => {
    const all = Array.from({ length: 500 }, generateSessionCode).join('');
    expect(all).not.toMatch(/[IO01]/);
  });

  it('is not constant', () => {
    const codes = new Set(Array.from({ length: 50 }, generateSessionCode));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe('randomKey', () => {
  it('returns 20 alphanumeric chars', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomKey()).toMatch(/^[A-Za-z0-9]{20}$/);
    }
  });

  it('is not time-ordered (no shared prefix between consecutive keys)', () => {
    const keys = Array.from({ length: 20 }, randomKey);
    const sharedPrefix = keys.filter((k, i) => i > 0 && k.slice(0, 4) === keys[i - 1].slice(0, 4));
    expect(sharedPrefix.length).toBeLessThan(2);
  });
});
```

`src/lib/serialize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toFirebaseCategories } from './serialize';

describe('toFirebaseCategories', () => {
  it('drops nameFr when undefined or blank', () => {
    const out = toFirebaseCategories([
      { name: 'Fun', nameFr: undefined, positiveDescription: 'yay', negativeDescription: 'meh' },
      { name: 'Stress', nameFr: '', positiveDescription: 'calm', negativeDescription: 'panic' },
    ]);
    expect(out).toEqual([
      { name: 'Fun', positiveDescription: 'yay', negativeDescription: 'meh' },
      { name: 'Stress', positiveDescription: 'calm', negativeDescription: 'panic' },
    ]);
    out.forEach((c) => expect('nameFr' in c).toBe(false));
  });

  it('keeps nameFr when set', () => {
    const out = toFirebaseCategories([
      { name: 'Learning', nameFr: 'Apprentissage', positiveDescription: 'a', negativeDescription: 'b' },
    ]);
    expect(out[0].nameFr).toBe('Apprentissage');
  });

  it('drops unknown extra keys', () => {
    const input = [{ name: 'X', positiveDescription: 'a', negativeDescription: 'b', id: 3 }] as never;
    expect(Object.keys(toFirebaseCategories(input)[0]).sort()).toEqual(
      ['name', 'negativeDescription', 'positiveDescription'],
    );
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./sessionCode"` and `"./serialize"`.

- [ ] **Step 5: Implement**

`src/lib/sessionCode.ts`:

```ts
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Same pattern is enforced in database.rules.json. */
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function randomString(alphabet: string, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function generateSessionCode(): string {
  return randomString(CODE_ALPHABET, 6);
}

/** Random (not time-ordered) key so vote order can't be matched to voter order. */
export function randomKey(): string {
  return randomString(KEY_ALPHABET, 20);
}
```

`src/lib/serialize.ts`:

```ts
import { Category } from '../types';

/** Firebase rejects `undefined` values: keep only known fields, drop unset nameFr. */
export function toFirebaseCategories(categories: Category[]): Category[] {
  return categories.map(({ name, nameFr, positiveDescription, negativeDescription }) => ({
    name,
    positiveDescription,
    negativeDescription,
    ...(nameFr ? { nameFr } : {}),
  }));
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (8 tests).

- [ ] **Step 7: Type-check and commit**

```bash
npx tsc -p tsconfig.json --noEmit
git add package.json package-lock.json vite.config.ts src/lib/sessionCode.ts src/lib/sessionCode.test.ts src/lib/serialize.ts src/lib/serialize.test.ts
git commit -m "feat: add session code generation and category serialization"
```

---

### Task 2: `deriveClientState` and session helpers

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/deriveClientState.ts`
- Test: `src/lib/deriveClientState.test.ts`

**Interfaces:**
- Consumes: `Category`, `Vote`, `SessionPhase`, `ClientSessionState`, `CategoryResult` from `src/types.ts`.
- Produces:
  - `type Indexed<T> = Record<string, T> | (T | null | undefined)[]`
  - `interface RawSession { meta; state; participants; voters; votes; notes }` (see code)
  - `deriveClientState(code: string, raw: RawSession, myId: string): ClientSessionState | null`
  - `readableVoteIndexes(state: { phase: SessionPhase; currentCategoryIndex: number }, categoryCount: number): number[]`
  - `shouldAutoReveal(session: ClientSessionState): boolean`
  - `ClientSessionState` gains `myId: string` and `facilitatorId: string`.

- [ ] **Step 1: Extend `ClientSessionState` in `src/types.ts`**

In the `ClientSessionState` interface, after `isFacilitator: boolean;`, add:

```ts
  /** Current user's participant id (Firebase anonymous uid) */
  myId: string;
  facilitatorId: string;
```

- [ ] **Step 2: Write the failing tests**

`src/lib/deriveClientState.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Category, ClientSessionState } from '../types';
import {
  RawSession,
  deriveClientState,
  readableVoteIndexes,
  shouldAutoReveal,
} from './deriveClientState';

const categories: Category[] = [
  { name: 'Fun', positiveDescription: 'p', negativeDescription: 'n' },
  { name: 'Learning', positiveDescription: 'p', negativeDescription: 'n' },
  { name: 'Teamwork', positiveDescription: 'p', negativeDescription: 'n' },
];

function raw(overrides: Partial<RawSession> = {}): RawSession {
  return {
    meta: { facilitatorId: 'fac', categories, createdAt: 1 },
    state: { phase: 'lobby', currentCategoryIndex: 0 },
    participants: { fac: { name: 'Alice' }, bob: { name: 'Bob' } },
    voters: null,
    votes: null,
    notes: null,
    ...overrides,
  };
}

describe('deriveClientState', () => {
  it('returns null until meta and state are loaded', () => {
    expect(deriveClientState('ABC234', raw({ meta: null }), 'fac')).toBeNull();
    expect(deriveClientState('ABC234', raw({ state: null }), 'fac')).toBeNull();
  });

  it('maps lobby state with identity fields', () => {
    const s = deriveClientState('ABC234', raw(), 'fac')!;
    expect(s.code).toBe('ABC234');
    expect(s.phase).toBe('lobby');
    expect(s.categories).toEqual(categories);
    expect(s.isFacilitator).toBe(true);
    expect(s.myId).toBe('fac');
    expect(s.facilitatorId).toBe('fac');
    expect(s.totalParticipants).toBe(2);
    expect(s.voteCount).toBe(0);
    expect(s.hasVoted).toBe(false);
    expect(s.currentResults).toBeNull();
    expect(s.allResults).toEqual([]);
    expect(s.notes).toEqual({});
  });

  it('sorts participants by name and handles none', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ participants: { z: { name: 'Zoe' }, a: { name: 'adam' }, m: { name: 'Mia' } } }),
      'a',
    )!;
    expect(s.participants.map((p) => p.name)).toEqual(['adam', 'Mia', 'Zoe']);
    expect(s.isFacilitator).toBe(false);

    const empty = deriveClientState('ABC234', raw({ participants: null }), 'x')!;
    expect(empty.participants).toEqual([]);
    expect(empty.totalParticipants).toBe(0);
  });

  it('counts voters of the current category only and sets hasVoted', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'voting', currentCategoryIndex: 1 },
        voters: { '0': { fac: true, bob: true }, '1': { bob: true } },
      }),
      'bob',
    )!;
    expect(s.voteCount).toBe(1);
    expect(s.hasVoted).toBe(true);
    expect(s.currentResults).toBeNull();
  });

  it('reads sparse arrays the same way as objects (RTDB integer keys)', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'revealed', currentCategoryIndex: 2 },
        voters: [null, undefined, { fac: true, bob: true }],
        votes: [null, null, { k1: { color: 'green', trend: 'up' }, k2: { color: 'red', trend: 'down' } }],
        notes: [null, 'about learning', 'about teamwork'],
      }),
      'fac',
    )!;
    expect(s.voteCount).toBe(2);
    expect(s.currentResults).toHaveLength(2);
    expect(s.currentResults).toContainEqual({ color: 'green', trend: 'up' });
    expect(s.notes).toEqual({ 1: 'about learning', 2: 'about teamwork' });
  });

  it('returns an empty result list when revealed with no votes', () => {
    const s = deriveClientState(
      'ABC234',
      raw({ state: { phase: 'revealed', currentCategoryIndex: 0 } }),
      'fac',
    )!;
    expect(s.currentResults).toEqual([]);
  });

  it('builds allResults with notes for every category when finished', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'finished', currentCategoryIndex: 1 },
        votes: { '0': { k: { color: 'orange', trend: 'stable' } } },
        notes: { '0': 'fun notes' },
      }),
      'bob',
    )!;
    expect(s.allResults).toEqual([
      { categoryIndex: 0, votes: [{ color: 'orange', trend: 'stable' }], notes: 'fun notes' },
      { categoryIndex: 1, votes: [], notes: '' },
      { categoryIndex: 2, votes: [], notes: '' },
    ]);
  });
});

describe('readableVoteIndexes', () => {
  it('reads nothing in lobby or during voting', () => {
    expect(readableVoteIndexes({ phase: 'lobby', currentCategoryIndex: 0 }, 3)).toEqual([]);
    expect(readableVoteIndexes({ phase: 'voting', currentCategoryIndex: 2 }, 3)).toEqual([]);
  });

  it('reads only the current category when revealed', () => {
    expect(readableVoteIndexes({ phase: 'revealed', currentCategoryIndex: 1 }, 3)).toEqual([1]);
  });

  it('reads every category when finished', () => {
    expect(readableVoteIndexes({ phase: 'finished', currentCategoryIndex: 0 }, 3)).toEqual([0, 1, 2]);
  });
});

describe('shouldAutoReveal', () => {
  const base = deriveClientState(
    'ABC234',
    raw({ state: { phase: 'voting', currentCategoryIndex: 0 }, voters: { '0': { fac: true, bob: true } } }),
    'fac',
  ) as ClientSessionState;

  it('fires for the facilitator when everyone voted', () => {
    expect(shouldAutoReveal(base)).toBe(true);
  });

  it('does not fire for participants', () => {
    expect(shouldAutoReveal({ ...base, isFacilitator: false })).toBe(false);
  });

  it('does not fire while votes are missing', () => {
    expect(shouldAutoReveal({ ...base, voteCount: 1 })).toBe(false);
  });

  it('does not fire with zero participants', () => {
    expect(shouldAutoReveal({ ...base, voteCount: 0, totalParticipants: 0 })).toBe(false);
  });

  it('does not fire outside the voting phase', () => {
    expect(shouldAutoReveal({ ...base, phase: 'revealed' })).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./deriveClientState"`.

- [ ] **Step 4: Implement `src/lib/deriveClientState.ts`**

```ts
import {
  Category,
  CategoryResult,
  ClientSessionState,
  SessionPhase,
  Vote,
} from '../types';

/**
 * RTDB returns objects whose keys are integers (0..n) as arrays,
 * possibly with null holes — so per-category children may be either shape.
 */
export type Indexed<T> = Record<string, T> | (T | null | undefined)[];

export interface SessionStateNode {
  phase: SessionPhase;
  currentCategoryIndex: number;
}

/** Raw contents of /sessions/{code}, one field per listened child. */
export interface RawSession {
  meta: { facilitatorId: string; categories: Category[]; createdAt?: number } | null;
  state: SessionStateNode | null;
  participants: Record<string, { name: string }> | null;
  voters: Indexed<Record<string, true>> | null;
  votes: Indexed<Record<string, Vote>> | null;
  notes: Indexed<string> | null;
}

function at<T>(coll: Indexed<T> | null, idx: number): T | undefined {
  if (!coll) return undefined;
  return (coll as Record<string, T | null | undefined>)[String(idx)] ?? undefined;
}

function votesAt(raw: RawSession, idx: number): Vote[] {
  return Object.values(at(raw.votes, idx) ?? {});
}

export function deriveClientState(
  code: string,
  raw: RawSession,
  myId: string,
): ClientSessionState | null {
  if (!raw.meta || !raw.state) return null;

  const { categories, facilitatorId } = raw.meta;
  const { phase, currentCategoryIndex } = raw.state;

  const participants = Object.entries(raw.participants ?? {})
    .map(([id, p]) => ({ id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roundVoters = at(raw.voters, currentCategoryIndex) ?? {};

  const notes: Record<number, string> = {};
  categories.forEach((_, i) => {
    const n = at(raw.notes, i);
    if (n) notes[i] = n;
  });

  const allResults: CategoryResult[] =
    phase === 'finished'
      ? categories.map((_, i) => ({
          categoryIndex: i,
          votes: votesAt(raw, i),
          notes: notes[i] ?? '',
        }))
      : [];

  return {
    code,
    categories,
    participants,
    currentCategoryIndex,
    phase,
    voteCount: Object.keys(roundVoters).length,
    totalParticipants: participants.length,
    hasVoted: Boolean(roundVoters[myId]),
    isFacilitator: facilitatorId === myId,
    myId,
    facilitatorId,
    currentResults: phase === 'revealed' ? votesAt(raw, currentCategoryIndex) : null,
    allResults,
    notes,
  };
}

/**
 * Vote indexes the rules allow reading. Listening to any other index gets the
 * listener cancelled with PERMISSION_DENIED, so only these may be attached.
 */
export function readableVoteIndexes(state: SessionStateNode, categoryCount: number): number[] {
  if (state.phase === 'finished') return Array.from({ length: categoryCount }, (_, i) => i);
  if (state.phase === 'revealed') return [state.currentCategoryIndex];
  return [];
}

/** The facilitator's tab reveals the round once every participant has voted. */
export function shouldAutoReveal(session: ClientSessionState): boolean {
  return (
    session.isFacilitator &&
    session.phase === 'voting' &&
    session.totalParticipants > 0 &&
    session.voteCount >= session.totalParticipants
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all tests in 3 files).

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc -p tsconfig.json --noEmit` — expected: no errors (nothing constructs `ClientSessionState` in the frontend yet besides this module).

```bash
git add src/types.ts src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts
git commit -m "feat: derive client session state from realtime database data"
```

---

### Task 3: Firebase project, SDK setup and security rules

**Files:**
- Create: `src/lib/firebaseConfig.ts`, `src/lib/firebase.ts`, `database.rules.json`

**Interfaces:**
- Produces: `getDb(): Database`, `ensureSignedIn(): Promise<string>` (resolves the anonymous uid), `isFirebaseConfigured(): boolean` from `src/lib/firebase.ts`.

- [ ] **Step 1: Install the SDK**

```bash
npm install firebase@^12
```

- [ ] **Step 2: Write `database.rules.json`**

```json
{
  "rules": {
    "sessions": {
      "$code": {
        "meta": {
          ".read": "auth != null",
          ".write": "auth != null && !data.exists() && $code.matches(/^[A-HJ-NP-Z2-9]{6}$/) && newData.child('facilitatorId').val() === auth.uid",
          ".validate": "newData.hasChildren(['facilitatorId', 'categories', 'createdAt'])",
          "facilitatorId": { ".validate": "newData.isString()" },
          "categories": { ".validate": "newData.hasChildren()" },
          "createdAt": { ".validate": "newData.isNumber()" },
          "$other": { ".validate": false }
        },
        "state": {
          ".read": "auth != null",
          ".write": "auth != null && newData.exists() && newData.parent().child('meta/facilitatorId').val() === auth.uid",
          ".validate": "newData.hasChildren(['phase', 'currentCategoryIndex'])",
          "phase": { ".validate": "newData.val() === 'lobby' || newData.val() === 'voting' || newData.val() === 'revealed' || newData.val() === 'finished'" },
          "currentCategoryIndex": { ".validate": "newData.isNumber() && newData.val() >= 0" },
          "$other": { ".validate": false }
        },
        "participants": {
          ".read": "auth != null",
          "$uid": {
            ".write": "auth != null && $uid === auth.uid && newData.exists() && root.child('sessions/' + $code + '/meta').exists()",
            ".validate": "newData.hasChildren(['name'])",
            "name": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 50" },
            "$other": { ".validate": false }
          }
        },
        "voters": {
          ".read": "auth != null",
          "$idx": {
            "$uid": {
              ".write": "auth != null && $uid === auth.uid && !data.exists() && root.child('sessions/' + $code + '/participants/' + auth.uid).exists() && root.child('sessions/' + $code + '/state/phase').val() === 'voting' && root.child('sessions/' + $code + '/state/currentCategoryIndex').val() + '' === $idx",
              ".validate": "newData.val() === true"
            }
          }
        },
        "votes": {
          "$idx": {
            ".read": "auth != null && (root.child('sessions/' + $code + '/state/phase').val() !== 'voting' || root.child('sessions/' + $code + '/state/currentCategoryIndex').val() + '' !== $idx)",
            "$key": {
              ".write": "auth != null && !data.exists() && !root.child('sessions/' + $code + '/voters/' + $idx + '/' + auth.uid).exists() && newData.parent().parent().parent().child('voters/' + $idx + '/' + auth.uid).exists()",
              ".validate": "$key.length === 20 && newData.hasChildren(['color', 'trend'])",
              "color": { ".validate": "newData.val() === 'green' || newData.val() === 'orange' || newData.val() === 'red'" },
              "trend": { ".validate": "newData.val() === 'up' || newData.val() === 'stable' || newData.val() === 'down'" },
              "$other": { ".validate": false }
            }
          }
        },
        "notes": {
          ".read": "auth != null",
          "$idx": {
            ".write": "auth != null && root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid",
            ".validate": "newData.isString() && newData.val().length <= 5000"
          }
        }
      }
    }
  }
}
```

Notes for the implementer:
- `state` creation is allowed because `meta` (with `facilitatorId === auth.uid`) is written in the same multi-path update and `newData.parent()` reflects the post-write session. `meta` can never be rewritten, so later `state` writes are facilitator-only.
- The `votes/$idx/$key` write rule compares `root` (pre-write: voter flag absent) with `newData` (post-write: voter flag present) to force vote + voter flag into one atomic update.
- `val() + ''` converts the numeric index to a string for comparison with `$idx`. If the manual test in Task 7 shows votes being rejected, this comparison is the first suspect.

- [ ] **Step 3: Create the Firebase project (manual, done by the user, ~10 min)**

1. https://console.firebase.google.com → **Add project** → name `squad-health-check` → disable Google Analytics → Create.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
3. **Authentication → Settings → Authorized domains → Add domain** → `feoche.github.io`.
4. **Build → Realtime Database → Create database** → pick a location (e.g. `europe-west1`) → **Start in locked mode**.
5. **Realtime Database → Rules** → paste the contents of `database.rules.json` → **Publish**.
6. **Project settings (gear) → General → Your apps → Web (`</>`)** → nickname `web` → Register (no Hosting) → copy the `firebaseConfig` object (it must include `databaseURL`).

- [ ] **Step 4: Write `src/lib/firebaseConfig.ts`** with the values from step 3.6:

```ts
/**
 * Public Firebase web config. These values are not secrets: access is
 * controlled by database.rules.json. Fill in from Firebase console →
 * Project settings → Your apps (see README).
 */
export const firebaseConfig = {
  apiKey: '<from console>',
  authDomain: '<project-id>.firebaseapp.com',
  databaseURL: 'https://<project-id>-default-rtdb.<region>.firebasedatabase.app',
  projectId: '<project-id>',
  storageBucket: '<project-id>.firebasestorage.app',
  messagingSenderId: '<from console>',
  appId: '<from console>',
};
```

The `<…>` values are replaced by the real ones from the console before committing. If the project isn't created yet, commit with empty strings (`''`) for every field. `isFirebaseConfigured()` then returns `false` and the UI shows a setup error instead of crashing.

- [ ] **Step 5: Write `src/lib/firebase.ts`**

```ts
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInAnonymously } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

let app: FirebaseApp | undefined;
let signingIn: Promise<string> | undefined;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);
}

/* Lazy so a missing config produces a readable error, not a blank page at import time */
function getApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured — fill in src/lib/firebaseConfig.ts (see README).');
  }
  return (app ??= initializeApp(firebaseConfig));
}

export function getDb(): Database {
  return getDatabase(getApp());
}

function getAuthInstance(): Auth {
  return getAuth(getApp());
}

/**
 * Resolves the anonymous uid, signing in on first use. The uid persists in
 * IndexedDB, so reloads keep the same participant identity.
 */
export function ensureSignedIn(): Promise<string> {
  signingIn ??= (async () => {
    const auth = getAuthInstance();
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  })().catch((err) => {
    signingIn = undefined;
    throw err;
  });
  return signingIn;
}
```

- [ ] **Step 6: Type-check, run tests and commit**

```bash
npx tsc -p tsconfig.json --noEmit
npm test
git add package.json package-lock.json database.rules.json src/lib/firebaseConfig.ts src/lib/firebase.ts
git commit -m "feat: add Firebase setup and realtime database security rules"
```

---

### Task 4: `sessionStore` — all Firebase reads, writes and listeners

**Files:**
- Create: `src/lib/sessionStore.ts`

**Interfaces:**
- Consumes: `getDb`, `ensureSignedIn` (Task 3); `generateSessionCode`, `randomKey` (Task 1); `toFirebaseCategories` (Task 1); `RawSession`, `deriveClientState`, `readableVoteIndexes` (Task 2).
- Produces (all used by Task 5):
  - `createSession(categories: Category[]): Promise<string>` → session code
  - `sessionExists(code: string): Promise<boolean>`
  - `getParticipantName(code: string, uid: string): Promise<string | null>`
  - `joinSession(code: string, uid: string, name: string): Promise<void>`
  - `subscribeSession(code: string, uid: string, onState: (s: ClientSessionState) => void): () => void`
  - `subscribeConnection(onChange: (connected: boolean) => void): () => void`
  - `startVoting(s: ClientSessionState): Promise<void>`
  - `submitVote(s: ClientSessionState, vote: Vote): Promise<void>`
  - `revealVotes(s: ClientSessionState): Promise<void>`
  - `nextCategory(s: ClientSessionState): Promise<void>`
  - `updateNotes(s: ClientSessionState, categoryIndex: number, notes: string): Promise<void>`
  - `endSession(s: ClientSessionState): Promise<void>`
  - `describeError(err: unknown): string`

This module is thin glue over the Firebase SDK. It has no unit tests (no emulator, by decision); its logic-bearing parts live in the tested pure modules. It is verified by the type checker and by the manual checklist in Task 7.

- [ ] **Step 1: Write `src/lib/sessionStore.ts`**

```ts
import {
  DataSnapshot,
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { Category, ClientSessionState, Vote } from '../types';
import { ensureSignedIn, getDb } from './firebase';
import { generateSessionCode, randomKey } from './sessionCode';
import { toFirebaseCategories } from './serialize';
import { RawSession, deriveClientState, readableVoteIndexes } from './deriveClientState';

type Unsubscribe = () => void;

const sessionRef = (code: string, path = '') =>
  ref(getDb(), `sessions/${code}${path ? `/${path}` : ''}`);

function isPermissionDenied(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined;
  return /permission.denied/i.test(`${e?.code ?? ''} ${e?.message ?? ''}`);
}

export function describeError(err: unknown): string {
  if (isPermissionDenied(err)) return 'Not allowed — the session may have changed. Try reloading.';
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Check your connection and try again.';
}

/* ─── Create / join ─── */

const MAX_CODE_ATTEMPTS = 3;

export async function createSession(categories: Category[]): Promise<string> {
  const uid = await ensureSignedIn();
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateSessionCode();
    try {
      await update(sessionRef(code), {
        meta: {
          facilitatorId: uid,
          categories: toFirebaseCategories(categories),
          createdAt: serverTimestamp(),
        },
        state: { phase: 'lobby', currentCategoryIndex: 0 },
      });
      return code;
    } catch (err) {
      /* Rules deny writing meta of an existing session → code collision, retry */
      if (!isPermissionDenied(err)) throw err;
    }
  }
  throw new Error('Could not create a session. Please try again.');
}

export async function sessionExists(code: string): Promise<boolean> {
  await ensureSignedIn();
  const snap = await get(sessionRef(code, 'meta/facilitatorId'));
  return snap.exists();
}

export async function getParticipantName(code: string, uid: string): Promise<string | null> {
  const snap = await get(sessionRef(code, `participants/${uid}/name`));
  return snap.exists() ? (snap.val() as string) : null;
}

export async function joinSession(code: string, uid: string, name: string): Promise<void> {
  await set(sessionRef(code, `participants/${uid}`), { name });
}

/* ─── Subscriptions ─── */

export function subscribeSession(
  code: string,
  uid: string,
  onState: (s: ClientSessionState) => void,
): Unsubscribe {
  const raw: RawSession = {
    meta: null,
    state: null,
    participants: null,
    voters: null,
    votes: {},
    notes: null,
  };
  const unsubs: Unsubscribe[] = [];
  const voteUnsubs = new Map<number, Unsubscribe>();

  const emit = () => {
    const state = deriveClientState(code, raw, uid);
    if (state) onState(state);
  };

  const warnCancelled = (path: string) => (err: Error) =>
    console.warn(`[session] listener on ${path} cancelled`, err);

  /* Attach vote listeners only where the rules allow reading (see readableVoteIndexes) */
  const syncVoteListeners = () => {
    if (!raw.meta || !raw.state) return;
    for (const i of readableVoteIndexes(raw.state, raw.meta.categories.length)) {
      if (voteUnsubs.has(i)) continue;
      voteUnsubs.set(
        i,
        onValue(
          sessionRef(code, `votes/${i}`),
          (snap: DataSnapshot) => {
            (raw.votes as Record<string, Record<string, Vote>>)[String(i)] = snap.val() ?? {};
            emit();
          },
          warnCancelled(`votes/${i}`),
        ),
      );
    }
  };

  const listen = (key: 'meta' | 'state' | 'participants' | 'voters' | 'notes') => {
    unsubs.push(
      onValue(
        sessionRef(code, key),
        (snap: DataSnapshot) => {
          (raw as unknown as Record<string, unknown>)[key] = snap.val();
          if (key === 'meta' || key === 'state') syncVoteListeners();
          emit();
        },
        warnCancelled(key),
      ),
    );
  };

  listen('meta');
  listen('state');
  listen('participants');
  listen('voters');
  listen('notes');

  return () => {
    unsubs.forEach((u) => u());
    voteUnsubs.forEach((u) => u());
  };
}

/** Reports connection changes, but only after the first successful connection. */
export function subscribeConnection(onChange: (connected: boolean) => void): Unsubscribe {
  let seenOnline = false;
  return onValue(ref(getDb(), '.info/connected'), (snap) => {
    const online = snap.val() === true;
    if (online) seenOnline = true;
    if (seenOnline) onChange(online);
  });
}

/* ─── Facilitator actions (guards mirror the former server) ─── */

const writeState = (s: ClientSessionState, patch: Record<string, unknown>) =>
  update(sessionRef(s.code, 'state'), patch);

export async function startVoting(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'lobby') return;
  await writeState(s, { phase: 'voting' });
}

export async function revealVotes(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'voting') return;
  await writeState(s, { phase: 'revealed' });
}

export async function nextCategory(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'revealed') return;
  if (s.currentCategoryIndex >= s.categories.length - 1) return;
  await writeState(s, { phase: 'voting', currentCategoryIndex: s.currentCategoryIndex + 1 });
}

export async function endSession(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator) return;
  await writeState(s, { phase: 'finished' });
}

export async function updateNotes(
  s: ClientSessionState,
  categoryIndex: number,
  notes: string,
): Promise<void> {
  if (!s.isFacilitator) return;
  await set(sessionRef(s.code, `notes/${categoryIndex}`), notes);
}

/* ─── Participant action ─── */

/** Voter flag and anonymous vote are written atomically; rules require both. */
export async function submitVote(s: ClientSessionState, vote: Vote): Promise<void> {
  if (s.phase !== 'voting' || s.hasVoted) return;
  const idx = s.currentCategoryIndex;
  await update(sessionRef(s.code), {
    [`voters/${idx}/${s.myId}`]: true,
    [`votes/${idx}/${randomKey()}`]: { color: vote.color, trend: vote.trend },
  });
}
```

Note: `startVoting` only runs from `lobby` (the server also allowed `revealed`, but no UI calls it there; and re-opening voting on a revealed category would make the rules cancel the live `votes/{idx}` listener).

- [ ] **Step 2: Type-check, run tests and commit**

```bash
npx tsc -p tsconfig.json --noEmit
npm test
git add src/lib/sessionStore.ts
git commit -m "feat: add realtime database session store"
```

---

### Task 5: Wire the UI to the session store (+ HashRouter, reconnect banner)

**Files:**
- Modify: `src/pages/CreateSession.tsx`, `src/pages/SessionPage.tsx`, `src/components/Lobby.tsx`, `src/components/ResultsGrid.tsx`, `src/main.tsx`, `src/App.tsx`, `src/styles/main.css`
- Delete: `src/hooks/useNetworkOrigin.ts`

**Interfaces:**
- Consumes: everything listed as produced by Task 4; `shouldAutoReveal` (Task 2); `ensureSignedIn` (Task 3).

- [ ] **Step 1: Replace `src/pages/CreateSession.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../types';
import { defaultCategories } from '../data/defaultCategories';
import CategoryEditor from '../components/CategoryEditor';
import { createSession, describeError } from '../lib/sessionStore';

function CreateSession() {
  const [categories, setCategories] = useState<Category[]>([
    ...defaultCategories,
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (categories.length === 0) return;
    setIsCreating(true);
    setError('');
    try {
      const code = await createSession(categories);
      navigate(`/session/${code}`);
    } catch (err) {
      setError(describeError(err));
      setIsCreating(false);
    }
  };

  return (
    <div className="create-session-page">
      <h2>Create New Session</h2>
      <p className="subtitle">
        Customise the categories for your health check, then start the session.
      </p>

      <CategoryEditor categories={categories} onChange={setCategories} />

      {error && <div className="error-message">{error}</div>}

      <div className="create-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleCreate}
          disabled={categories.length === 0 || isCreating}
        >
          {isCreating
            ? 'Creating…'
            : `Start Session (${categories.length} categories)`}
        </button>
      </div>
    </div>
  );
}

export default CreateSession;
```

- [ ] **Step 2: Replace `src/pages/SessionPage.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { shouldAutoReveal } from '../lib/deriveClientState';
import * as store from '../lib/sessionStore';
import Lobby from '../components/Lobby';
import VotingView from '../components/VotingView';
import SessionFinished from '../components/SessionFinished';

const warn = (err: unknown) => console.warn('[session]', err);

function SessionPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(true);

  /* Sign in, check the session exists, and auto-rejoin if this browser already joined */
  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) setError('Session not found');
          return;
        }
        const existingName = await store.getParticipantName(code, id);
        if (cancelled) return;
        setUid(id);
        if (existingName) {
          setName(existingName);
          setJoined(true);
        }
      } catch (err) {
        if (!cancelled) setError(store.describeError(err));
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  /* Live session state once joined */
  useEffect(() => {
    if (!joined || !uid) return;
    return store.subscribeSession(code, uid, setSession);
  }, [joined, uid, code]);

  /* Connection banner (only after Firebase is known to be configured) */
  useEffect(() => {
    if (!uid) return;
    return store.subscribeConnection(setConnected);
  }, [uid]);

  /* Facilitator's tab auto-reveals when everyone has voted */
  useEffect(() => {
    if (session && shouldAutoReveal(session)) store.revealVotes(session).catch(warn);
  }, [session]);

  /* ─── Join handler ─── */
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !uid) return;
    setIsJoining(true);
    setError('');
    try {
      await store.joinSession(code, uid, trimmed);
      setJoined(true);
    } catch (err) {
      setError(store.describeError(err));
    } finally {
      setIsJoining(false);
    }
  };

  /* ─── Actions (memoised) ─── */
  const handleStartVoting = useCallback(() => {
    if (session) store.startVoting(session).catch(warn);
  }, [session]);
  const handleSubmitVote = useCallback(
    (color: VoteColor, trend: VoteTrend) => {
      if (session) store.submitVote(session, { color, trend }).catch(warn);
    },
    [session],
  );
  const handleRevealVotes = useCallback(() => {
    if (session) store.revealVotes(session).catch(warn);
  }, [session]);
  const handleNextCategory = useCallback(() => {
    if (session) store.nextCategory(session).catch(warn);
  }, [session]);
  const handleUpdateNotes = useCallback(
    (categoryIndex: number, notes: string) => {
      if (session) store.updateNotes(session, categoryIndex, notes).catch(warn);
    },
    [session],
  );
  const handleEndSession = useCallback(() => {
    if (session) store.endSession(session).catch(warn);
  }, [session]);

  /* ─── Checking / join form ─── */
  if (checking) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Connecting to session…</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="join-page">
        <div className="card join-card">
          <h2>Join Session</h2>
          <p className="session-code-display">
            Session: <strong>{code}</strong>
          </p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              maxLength={50}
              autoFocus
              required
              disabled={!uid}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!uid || isJoining || !name.trim()}
            >
              {isJoining ? 'Joining…' : 'Join'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ─── Loading ─── */
  if (!session) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Connecting to session…</p>
      </div>
    );
  }

  /* ─── Session views ─── */
  let view: JSX.Element;
  switch (session.phase) {
    case 'lobby':
      view = <Lobby session={session} onStartVoting={handleStartVoting} />;
      break;
    case 'voting':
    case 'revealed':
      view = (
        <VotingView
          session={session}
          onSubmitVote={handleSubmitVote}
          onRevealVotes={handleRevealVotes}
          onNextCategory={handleNextCategory}
          onUpdateNotes={handleUpdateNotes}
          onEndSession={handleEndSession}
        />
      );
      break;
    case 'finished':
      view = <SessionFinished session={session} />;
      break;
    default:
      view = <div>Unknown session state</div>;
  }

  return (
    <>
      {!connected && <div className="connection-banner">Reconnecting…</div>}
      {view}
    </>
  );
}

export default SessionPage;
```

- [ ] **Step 3: Update `src/components/Lobby.tsx`**

Replace lines 1–15 (imports through the `myId` computation) with:

```tsx
import { ClientSessionState } from '../types';

interface Props {
  session: ClientSessionState;
  onStartVoting: () => void;
}

function Lobby({ session, onStartVoting }: Props) {
  const myId = session.myId;
  const shareUrl = `${window.location.origin}${window.location.pathname}#/session/${session.code}`;
```

Replace the two crown conditions inside the participant badge:

```tsx
                {p.id === myId && <span className="you-tag"> (You)</span>}
                {session.isFacilitator && p.id === session.participants[0]?.id && p.id !== myId && (
                  <span className="facilitator-tag"> 👑</span>
                )}
                {p.id === myId && session.isFacilitator && (
                  <span className="facilitator-tag"> 👑</span>
                )}
```

with:

```tsx
                {p.id === myId && <span className="you-tag"> (You)</span>}
                {p.id === session.facilitatorId && (
                  <span className="facilitator-tag"> 👑</span>
                )}
```

- [ ] **Step 4: Cap notes length in `src/components/ResultsGrid.tsx`**

On the facilitator `<textarea className="input textarea notes-textarea" …>`, add `maxLength={5000}` after `rows={4}`.

- [ ] **Step 5: Switch to `HashRouter` in `src/main.tsx`**

Replace both occurrences of `BrowserRouter` with `HashRouter` (the import and the JSX element).

- [ ] **Step 6: Router-aware home link in `src/App.tsx`**

```tsx
import { Routes, Route, Link } from 'react-router-dom';
```

and replace

```tsx
        <a href="/" className="app-logo-link">
          <h1>🏥 Squad Health Check</h1>
        </a>
```

with

```tsx
        <Link to="/" className="app-logo-link">
          <h1>🏥 Squad Health Check</h1>
        </Link>
```

- [ ] **Step 7: Add the banner style to `src/styles/main.css`** (append after the `.error-message` block):

```css
.connection-banner {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-orange-light);
  color: var(--color-orange);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
}
```

- [ ] **Step 8: Delete the LAN-IP hook**

```bash
git rm src/hooks/useNetworkOrigin.ts
```

- [ ] **Step 9: Verify no Socket.io usage remains in `src`, type-check, test**

```bash
grep -rn "socket\|sessionStorage\|useNetworkOrigin" src || echo "clean"
npx tsc -p tsconfig.json --noEmit
npm test
```

Expected: `clean`, no type errors, all tests pass.

- [ ] **Step 10: Smoke-test locally** (requires the real config from Task 3)

Run: `npx vite` → open `http://localhost:3000` → Create Session → join with a name → the lobby shows you with 👑 and a share URL of the form `http://localhost:3000/#/session/XXXXXX`.

- [ ] **Step 11: Commit**

```bash
git add -A src
git commit -m "feat: run sessions on Firebase instead of Socket.io"
```

---

### Task 6: Remove the server and prepare the build for GitHub Pages

**Files:**
- Delete: `server/`, `Dockerfile`
- Modify: `package.json`, `vite.config.ts`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Remove server code and dependencies**

```bash
git rm -r server Dockerfile
npm uninstall express socket.io socket.io-client concurrently tsx @types/express
npm pkg set scripts.dev="vite"
npm pkg delete scripts.start
```

Expected `scripts` in `package.json`: `dev`, `build`, `preview`, `test`.

- [ ] **Step 2: Set a relative base path in `vite.config.ts`**

Add `base: './',` as the first property of the `defineConfig` object, and remove `sourcemap: true,` from `build` (leaving `build: { outDir: 'dist' }`).

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Verify a clean production build**

```bash
rm -rf dist node_modules && npm ci && npm test && npm run build && grep -o 'src="./assets/[^"]*"' dist/index.html
```

Expected: tests pass, build succeeds, and the script tag path starts with `./assets/` (relative base applied).

- [ ] **Step 5: Preview the build under a sub-path**

```bash
npx vite preview --base /squad-health-check/ --port 4173
```

Open `http://localhost:4173/squad-health-check/` → the home page loads; navigate to Create → URL is `…/squad-health-check/#/create`; reload → still on Create.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: drop Socket.io server and deploy to GitHub Pages"
```

---

### Task 7: README, manual checklist and first deploy

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

````markdown
# 🏥 Squad Health Check

A real-time collaborative tool for running **Spotify Squad Health Check** sessions with your team. Static site on GitHub Pages; realtime sync via Firebase (free plan).

## Features

- **Real-time voting** — Everyone joins a session and votes simultaneously
- **Anonymous votes** — Results only show aggregate counts, never who voted what; votes can't be read before the reveal (enforced by database rules)
- **Customisable categories** — Pre-loaded with the classic Spotify categories, fully editable
- **Facilitator controls** — One person controls the flow (reveal, next category, end)
- **Auto-reveal** — Votes are revealed when everyone has voted (from the facilitator's open tab)
- **Discussion notes** — Facilitator can jot down key discussion points per category
- **Recap export** — Download results as **Markdown** or **PDF** at the end

## Firebase setup (once, ~10 min)

1. [Firebase console](https://console.firebase.google.com) → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Authentication → Settings → Authorized domains** → add `<your-user>.github.io`.
4. **Build → Realtime Database → Create database** → choose a location → **locked mode**.
5. **Realtime Database → Rules** → paste [`database.rules.json`](database.rules.json) → **Publish**. Repeat whenever that file changes.
6. **Project settings → Your apps → Web (`</>`)** → register → copy the config into [`src/lib/firebaseConfig.ts`](src/lib/firebaseConfig.ts).

The web config is public by design; access is controlled by the rules. Optionally restrict the API key to your Pages domain in Google Cloud console → APIs & Services → Credentials.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
```

## Deployment (GitHub Pages)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` tests, builds and deploys.
3. Share `https://<your-user>.github.io/squad-health-check/`.

## How to Use

1. **Facilitator** clicks "Create Session" → customises categories → starts session → enters their name
2. **Team members** open the shared link (or enter the 6-character code) → enter their name
3. For each category:
   - Everyone votes a **color** (🟢 happy / 🟠 issues / 🔴 needs fixing) and a **trend** (↗ / → / ↘)
   - Votes are revealed when everyone has voted (or the facilitator forces reveal)
   - Team discusses, facilitator writes notes
   - Facilitator clicks "Next Category"
4. At the end, everyone can **download the recap** as Markdown or PDF

Notes:
- The facilitator's tab must stay open for auto-reveal and for moving on; reloading it is fine (identity is kept).
- Two tabs in the same browser count as the same participant — use another browser or a private window to test alone.
- Known limitation: a participant tampering via devtools could submit more than one vote per round; the vote total shown in results makes this visible.

## Manual test checklist

Use two browsers (or one normal + one private window): **A** = facilitator, **B** = participant.

1. A: create a session, enter a name → lobby shows A with 👑 and the share link.
2. B: open the share link, enter a name → both lobbies list A and B.
3. A: Start Voting. B: vote → A shows "1/2 voted".
4. During voting, Firebase console → Realtime Database → Rules → **Rules Playground**: type *read*, location `/sessions/<CODE>/votes/<current index>`, Authenticated → **Run** → *Denied*. A's UI shows no results yet.
5. A: vote → round auto-reveals on both sides with 2 votes.
6. A: type notes → B sees them live.
7. B: reload → B lands back in the session without re-entering a name; same for A (still facilitator).
8. A: Next Category … Finish Session → both see the recap; Markdown and PDF downloads work.
9. Open `…/#/session/ZZZZZZ` → "Session not found".

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Realtime | Firebase Realtime Database + Anonymous Auth |
| Hosting | GitHub Pages (GitHub Actions) |
| Styling | Custom CSS (no framework) |
| PDF export | jsPDF + jsPDF-AutoTable |

## Project Structure

```
├── database.rules.json     # Firebase security rules
├── src/
│   ├── components/         # React components
│   ├── data/               # Default categories
│   ├── lib/
│   │   ├── firebase.ts         # Firebase init + anonymous sign-in
│   │   ├── firebaseConfig.ts   # Public web config
│   │   ├── sessionStore.ts     # All realtime reads/writes
│   │   ├── deriveClientState.ts# Raw data → UI state (pure, tested)
│   │   ├── sessionCode.ts      # Codes and random keys
│   │   └── serialize.ts        # Firebase-safe category payloads
│   ├── pages/              # Home, CreateSession, SessionPage
│   ├── styles/             # CSS
│   └── types.ts            # Shared types
└── .github/workflows/      # Pages deployment
```
````

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: document Firebase setup, deployment and manual testing"
git push -u origin main
```

- [ ] **Step 3: Enable Pages and verify the deploy**

1. GitHub → repo **Settings → Pages → Source: GitHub Actions**.
2. Watch: `gh run watch` (or the Actions tab) → both `build` and `deploy` jobs green.
3. Run the full manual checklist against `https://feoche.github.io/squad-health-check/`.

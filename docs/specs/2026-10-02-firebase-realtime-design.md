# Firebase Realtime Sessions — Design

**Date:** 2026-10-02
**Status:** Approved in conversation, pending written-spec review

## Goal

Host Squad Health Check on **GitHub Pages** (static only) while keeping shared,
real-time sessions. Replace the Express + Socket.io backend with **Firebase
Realtime Database** (free Spark plan) and **Firebase Anonymous Auth**.

### Constraints (from the user)

- Free and easy to set up.
- Hosted on GitHub Pages — repo `git@github.com:feoche/squad-health-check.git`.
- Automated tests: unit tests only (no Firebase emulator / Java).

### Assumptions

- Sessions stay ephemeral; no history UI.
- Existing feature set is preserved: anonymous votes, facilitator controls,
  auto-reveal, notes, Markdown/PDF export.
- Users are mostly colleagues; abuse resistance comes from database rules, not
  from rate limiting.

### Success criteria

- Facilitator opens the Pages URL, creates a session, shares the link/code.
- Participants on other machines join and see the same live state.
- No server process exists anywhere; the only external service is Firebase.
- Votes are unreadable by anyone (via UI or devtools) while a round is in the
  `voting` phase, and are never linked to a participant id.
- Only the facilitator can change the flow (start, reveal, next, notes, end).

## Architecture

```
GitHub Pages (static React app)
   │
   ├─ src/lib/firebase.ts         init app, auth, db (from firebaseConfig.ts)
   ├─ src/lib/sessionStore.ts     ONLY module that touches Firebase
   ├─ src/lib/deriveClientState.ts pure: raw snapshot + myId → ClientSessionState
   │
   └─ pages / components          consume ClientSessionState (unchanged shape + myId)
            │
            ▼
Firebase Realtime Database  ◄── database.rules.json enforces permissions
Firebase Anonymous Auth     ──► stable uid per browser = participantId
```

### Units

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `src/lib/firebaseConfig.ts` | Committed public web config object | — |
| `src/lib/firebase.ts` | `initializeApp`, export `auth`, `db`, `ensureSignedIn(): Promise<uid>` | firebase SDK, config |
| `src/lib/sessionCode.ts` | `generateSessionCode()` (same alphabet as today), `randomKey()` | — |
| `src/lib/deriveClientState.ts` | Pure transform `RawSession × uid → ClientSessionState` | `types.ts` |
| `src/lib/sessionStore.ts` | `createSession`, `joinSession`, `subscribeSession`, `subscribeConnection`, `startVoting`, `submitVote`, `revealVotes`, `nextCategory`, `updateNotes`, `endSession` | firebase.ts, sessionCode, deriveClientState |
| `database.rules.json` | Security rules (source of truth, pasted into console) | — |

Removed: `server/`, `Dockerfile`, `src/hooks/useNetworkOrigin.ts`, and the
`express`, `socket.io`, `socket.io-client`, `concurrently`, `@types/express`
dependencies. `tsx` stays only if still needed (it won't be — remove).

## Data model

Path: `/sessions/{CODE}` where `CODE` is 6 chars from
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

```
meta:
  facilitatorId: string        # uid of creator
  categories: Category[]
  createdAt: number            # ServerValue.TIMESTAMP
state:
  phase: 'lobby' | 'voting' | 'revealed' | 'finished'
  currentCategoryIndex: number
participants:
  {uid}: { name: string }
voters:
  {catIdx}: { {uid}: true }
votes:
  {catIdx}: { {randomKey}: { color, trend } }
notes:
  {catIdx}: string
```

- `votes` keys are 20-char random strings from `crypto.getRandomValues`, **not**
  Firebase push ids (push ids are time-ordered and could correlate with
  `voters` write time).
- `voters` and `votes` are separate so counts are public but choices are not
  attributable.

## Security rules (summary — full file in repo)

- Every read/write requires `auth != null`.
- `meta`: writable only on creation (`!data.exists()`), and `facilitatorId`
  must equal `auth.uid`. Readable by any authenticated user.
- `state`: writable only by `meta/facilitatorId`. Validate `phase` enum and
  `currentCategoryIndex` integer within `0..categories.length-1`.
  Creation: allowed together with `meta` in the same multi-path write
  (`newData.parent().child('meta/facilitatorId').val() == auth.uid`).
- `participants/{uid}`: writable only when `$uid == auth.uid`; `name` is a
  string of length 1–50.
- `voters/{idx}/{uid}`: writable only when `$uid == auth.uid`, `!data.exists()`,
  `state/phase == 'voting'`, and `$idx == state/currentCategoryIndex`, and the
  writer is in `participants`.
- `votes/{idx}/{key}`: **read** denied while `state/phase == 'voting'` **for
  the current category index** (past categories remain readable).
  **Write** only if `!data.exists()`, and the same multi-path update creates
  `voters/{idx}/{auth.uid}` (checked via `newData` of the session root vs
  `root` pre-write: exists after, not before). Validate `color`/`trend` enums.
- `notes/{idx}`: writable only by facilitator; string ≤ 5000 chars.
- Session root: no deletes by clients.

Read granularity: since rules cascade, `.read` is granted per child
(`meta`, `state`, `participants`, `voters`, `notes`, `votes/{idx}`), never at
the session root. The client therefore subscribes to each child separately.

## Client flows

### Create (`CreateSession.tsx`)
1. `uid = await ensureSignedIn()`.
2. `code = generateSessionCode()`; single `update()` at `/sessions/{code}` with
   `meta` and `state = {phase:'lobby', currentCategoryIndex:0}` only.
3. On `PERMISSION_DENIED` (code exists), retry with a new code, max 3 attempts.
4. Navigate to `/session/{code}`. As today, the facilitator is not a
   participant until they enter their name in the join form like everyone else.

### Join / rejoin (`SessionPage.tsx`)
1. `uid = await ensureSignedIn()`.
2. Read `meta` once. Missing → "Session not found".
3. If `participants/{uid}` exists → auto-rejoin (skip name form, reuse name).
   Otherwise show name form; on submit write `participants/{uid} = { name }`.
4. `subscribeSession(code, uid, setSession)`.
5. Anonymous auth persists in IndexedDB, so reloads keep the same uid —
   replaces the current `sessionStorage` bookkeeping.
6. **Behaviour change:** two tabs in the same browser are one participant.

### Subscribe
`subscribeSession` attaches `onValue` listeners to `meta`, `state`,
`participants`, `voters`, `notes`. It attaches a listener to
`votes/{currentCategoryIndex}` only when phase ≠ `voting`, plus listeners to
`votes/{i}` for `i < currentCategoryIndex`. On `finished` it listens to all
`votes/{i}`. Listeners are re-wired when `state` changes. Every change
recomputes `deriveClientState(raw, uid)` and calls the callback. Returns an
unsubscribe function.

### Actions
- `startVoting`: facilitator sets `state/phase = 'voting'` (from lobby or
  revealed — same guard as server today).
- `submitVote(color, trend)`: multi-path update
  `voters/{idx}/{uid}=true` + `votes/{idx}/{randomKey}={color,trend}`.
- `revealVotes`: facilitator, phase `voting` → `revealed`.
- `nextCategory`: facilitator, phase `revealed`, index < last → index+1,
  phase `voting`.
- `updateNotes(idx, text)`: facilitator writes `notes/{idx}`.
- `endSession`: facilitator sets phase `finished`.
- **Auto-reveal:** inside `SessionPage`, when `isFacilitator` and
  `phase == 'voting'` and `voteCount === totalParticipants && totalParticipants > 0`,
  call `revealVotes()`. Idempotent; if the facilitator is offline the round
  waits.

Semantics preserved from the current server: `totalParticipants` counts every
participant who has joined (not only online ones).

### `ClientSessionState` change
Add `myId: string` so `Lobby` no longer reads `sessionStorage`. All other
fields keep their current meaning.

## GitHub Pages

- `main.tsx`: `BrowserRouter` → `HashRouter` (URLs become `…/#/session/CODE`;
  Pages has no SPA fallback).
- `App.tsx`: header `<a href="/">` → `<Link to="/">`.
- `Lobby.tsx`: share URL =
  `${location.origin}${location.pathname}#/session/${code}`.
- `vite.config.ts`: `base: './'`; drop `sourcemap: true` (not needed on Pages).
- `.github/workflows/deploy.yml`: on push to `main` → checkout, setup-node 20,
  `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact`
  (`dist`), `actions/deploy-pages`. User enables Pages → Source: GitHub Actions.
- `package.json` scripts: `dev: vite`, `build`, `preview`, `test: vitest run`.

## Error handling

- Session not found → existing error message on join page.
- Auth/DB failure on create → inline error message (replaces the backend
  `alert`).
- `PERMISSION_DENIED` on an action → `console.warn`, no crash (UI state is
  driven by the subscription, so stale buttons self-correct).
- Connection state via `.info/connected` → small "Reconnecting…" banner in
  `SessionPage` when false after initial connect.

## Testing

- **Vitest** unit tests:
  - `deriveClientState`: vote hiding during voting, `hasVoted`,
    `isFacilitator`, `voteCount`/`totalParticipants`, `currentResults` on
    revealed, `allResults` + notes on finished, missing/empty children.
  - `sessionCode`: length, alphabet, `randomKey` length/charset.
- **Manual two-browser checklist** (in README): create, join from second
  browser, vote, verify devtools cannot read `votes` during voting, auto-reveal,
  non-facilitator cannot advance (try via console), notes, end, export.

## README

Replace Quick Start / Production with:
1. Firebase setup (~10 min): create project → Build → Authentication → enable
   Anonymous → Build → Realtime Database → create (locked mode) → Rules tab →
   paste `database.rules.json` → Project settings → add Web app → copy config
   into `src/lib/firebaseConfig.ts`.
   Optional: restrict the API key to the Pages domain in Google Cloud console.
2. Local dev: `npm install && npm run dev`.
3. Deploy: push to `main`; enable Pages (Source: GitHub Actions).
4. Manual test checklist.

## Out of scope

- Session cleanup / TTL (sessions are a few KB; 1 GB free quota).
- Presence-based participant counts.
- ODS migration.
- Emulator-based rules tests.

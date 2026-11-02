# Live Session Cap — Design

**Date:** 2026-10-14
**Status:** Pending written-spec review

## Goal

The tool is presented at a conference, on the author's own Firebase backend.
To avoid spam, **at most 5 sessions are active at the same time**. Creating a
6th while 5 are active is refused with a clear message.

The limit is enforced by the database rules, not by the app: the app is a
static page, so a check in the browser can be bypassed from devtools.

## Decisions

- **Every session counts**, live or asynchronous.
- **A slot frees up** when its session reaches `finished`, or 12 hours after
  the session was created if the facilitator abandons it.
- Existing sessions (created before this change) are not counted and keep
  working.
- No Cloud Function and no server: the project stays static plus Firebase
  rules. Rules cannot count children, so the cap is expressed as **5 fixed
  slots**.

## Data model

```
liveSlots:
  0..4:
    code: string          # the session holding this slot
sessions/{CODE}/meta:
  liveSlot: number        # 0..4, the slot the session was created in (new)
  createdAt: number       # now: server time, now enforced by the rules
```

A slot holds only a session code. Whether it is still busy is derived from the
holder session, so nothing has to be cleaned up when a session ends.

A slot is **free** when any of these holds:

1. it does not exist;
2. its holder's `state/phase` is `finished`;
3. its holder's `meta` does not exist (the session was deleted);
4. its holder's `meta/createdAt` is older than 12 hours (`43200000` ms).

## Rules (`database.rules.json`)

### `liveSlots`

```json
"liveSlots": {
  ".read": "auth != null",
  "$n": {
    ".write": "auth != null && $n.matches(/^[0-4]$/) && newData.exists() && newData.parent().parent().child('sessions/' + newData.child('code').val() + '/meta/facilitatorId').val() === auth.uid && newData.parent().parent().child('sessions/' + newData.child('code').val() + '/meta/liveSlot').val() + '' === $n && (!data.exists() || !root.child('sessions/' + data.child('code').val() + '/meta').exists() || root.child('sessions/' + data.child('code').val() + '/state/phase').val() === 'finished' || root.child('sessions/' + data.child('code').val() + '/meta/createdAt').val() < now - 43200000)",
    ".validate": "newData.hasChildren(['code']) && newData.child('code').isString() && newData.child('code').val().matches(/^[A-Z2-9]{6}$/)",
    "code": { ".validate": "newData.isString()" },
    "$other": { ".validate": false }
  }
}
```

- A slot is only ever written together with the metadata of the session that
  takes it: the new session's `facilitatorId` must be the caller and its
  `liveSlot` must name this slot. Nobody can hold a slot without a session.
- The free conditions read the **existing** data (`data`, `root`), so a
  concurrent claim of the same slot is refused: the winner's session is already
  there, recent and not finished.
- There is no delete rule: a slot is never emptied, only taken over.

### `sessions/$code/meta`

- `liveSlot` is added to the required children and validated:
  `newData.isNumber() && newData.val() >= 0 && newData.val() <= 4 && newData.val() % 1 === 0`.
- The write rule gains
  `newData.parent().parent().parent().child('liveSlots/' + newData.child('liveSlot').val() + '/code').val() === $code`:
  a session can only be created in a slot that names it, in the same atomic
  update.
- `createdAt` is validated `newData.val() === now` instead of `isNumber()`, so
  the 12-hour lease cannot be forged. `serverTimestamp()` already resolves to
  `now`.

Existing sessions are unaffected: their `meta` is never written again
(`!data.exists()`), and they have no slot.

## Client

### `src/lib/liveSessionSlots.ts` (new, pure)

```ts
export const MAX_LIVE_SESSIONS = 5;
export const LIVE_SLOT_LEASE_MS = 12 * 60 * 60 * 1000;

interface Holder { phase?: string; createdAt?: number } // undefined: session missing
export function freeLiveSlots(
  slots: Record<string, { code: string }> | null,
  holders: Record<string, Holder | undefined>, // by session code
  now: number,
): number[]
```

Returns the free slot numbers in order, applying the four conditions above.
Unit tested, including each condition, a full set, and a missing holder.

### `createSession` (`src/lib/sessionStore.ts`)

1. Read `liveSlots` and, for each holder code, `state/phase` and
   `meta/createdAt`. Server time comes from `.info/serverTimeOffset`.
2. `freeLiveSlots(...)` gives the candidates. None: throw
   `AppError(t.errors.liveSessionsFull(MAX_LIVE_SESSIONS))`.
3. Write one multi-path `update` on the database root:
   `liveSlots/{n}` = `{ code }`, plus `sessions/{code}/meta` (with `liveSlot: n`)
   and `sessions/{code}/state`, as today. It is atomic.
4. On a permission-denied error the cause is either a taken slot or a taken
   code. Re-read the slots: if the slot is no longer free, go to the next
   candidate; otherwise generate a new code. The existing
   expired-session cleanup keeps working. The total number of attempts stays
   bounded (`MAX_CODE_ATTEMPTS`).

### Message

`t.errors.liveSessionsFull(max)` in English and French, shown by the creation
page like the other errors:

- EN: `5 sessions are already running. Try again in a while.`
- FR: `5 sessions sont déjà en cours. Réessayez dans un moment.`

The number comes from `MAX_LIVE_SESSIONS`.

### Rules and constant stay in step

The rules hard-code slots `0..4` and the 12-hour lease; the app has
`MAX_LIVE_SESSIONS` and `LIVE_SLOT_LEASE_MS`. A unit test reads
`database.rules.json` and fails when the slot regex, the lease value or the
constants disagree.

## Rollout

1. Publish `database.rules.json` to the live database and check it is
   identical (commands in `CLAUDE.md`).
2. Push the app to `main`.

Between the two steps, the previously deployed app cannot create sessions (its
metadata has no `liveSlot`). The window is short. Sessions already running are
not affected.

## Verification

Unit tests only for code, as the project has no Firebase emulator:
`freeLiveSlots`, the rules-versus-constant test, the new message in both
languages (the existing i18n test checks both languages have the same keys).

The rules are verified by hand against the live database, with the author's
agreement since it writes real sessions: a throwaway script creates 5 sessions,
expects the 6th to be refused, finishes one, then expects the next creation to
succeed in its slot. Nothing is written by the check beyond those sessions.
The expectation that comparing a missing holder behaves as "free" (condition 3)
is part of this check.

## Out of scope

- Per-user limits. One browser can hold up to all 5 slots.
- A shorter lease for a session nobody joined. Someone could create 5 empty
  sessions and hold every slot for up to 12 hours; the author frees a slot by
  deleting `liveSlots/{n}` in the Firebase console. A shorter lease for
  unjoined sessions is a possible later change.
- Counting or showing running sessions on the creation page.
- Cleanup of old sessions (rules already allow deleting a session after six
  months).

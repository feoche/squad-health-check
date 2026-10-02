# Facilitator Notes — Design

**Date:** 2026-10-02
**Status:** Approved in conversation, pending written-spec review

## Goal

Discussion notes are for the facilitator only. They must never appear on the
screen the facilitator shares, nor be readable by participants. The facilitator
gets two views:

- **Screen-share view** — the existing session page, without any notes.
- **Facilitator notes view** — a separate page (opened in its own window) to
  write notes and a one-line takeaway per category, with a running summary of
  every category covered so far.

### Decisions (from the user)

- Per category: free-form **discussion notes** *and* a short **takeaway**.
- The notes view shows a summary of all categories so far (results + notes +
  takeaway).
- Notes and takeaways are **facilitator-only, always** — including at the end.
  Participants' recap shows votes only; exports are facilitator-only.
- The facilitator may see past categories' vote results mid-session (rules
  relaxed for closed categories).
- The screen-share recap at the end has **no** download buttons.

## Current state

- Notes live at `sessions/{code}/notes/{idx}` (string), readable by any
  authenticated user.
- `ResultsGrid` shows a notes textarea to the facilitator and a read-only notes
  block to participants.
- `SessionFinished` shows notes and offers Markdown/PDF exports to everyone.

## Routing and views

- New route `/session/:code/notes` → `FacilitatorNotesPage`.
  - Same sign-in and `subscribeSession` as `SessionPage`; no join form.
  - Invalid/unknown code → existing "Session not found" card.
  - Signed-in user is not the facilitator → card "Only the facilitator can open
    notes" with a link back to `/session/:code`.
- The facilitator sees an **"Open facilitator notes ↗"** button in `Lobby`,
  `VotingView` and `SessionFinished`. It calls
  `window.open('/session/<code>/notes' (base-aware), 'shc-notes-<code>')`; the
  named target re-focuses an already-open notes window.
- Both windows share the same anonymous uid (auth persists in IndexedDB) and
  stay in sync through Firebase — no cross-tab messaging.
- `ResultsGrid` loses its notes section for everyone.

## Notes page layout

1. **Header** — session code, "Category X of N", phase badge
   (lobby / voting / revealed / finished).
2. **Current category card** (hidden in lobby and finished phases) — category
   name, live vote count during voting or results once revealed, then:
   - "Discussion notes" textarea (≤ 5000 chars)
   - "Takeaway" single-line input (≤ 300 chars)
   Editable in every phase, so the facilitator can prepare during voting.
3. **Summary list** — every category from 0 up to the current one (all of them
   once finished). Each entry: dominant colour + trend and counts when votes
   are readable, takeaway, notes. Each entry's fields are editable inline.
4. **Finished phase** — Markdown and PDF download buttons, including notes and
   takeaways.

Field editing: each field keeps local state and writes to Firebase on change
(as today); remote updates replace local state only while the field is not
focused, so two windows don't fight over the cursor.

## Data model and rules

### Database

```
sessions/{code}/facilitator/{idx}: { notes?: string, takeaway?: string }
sessions/{code}/closed/{idx}: true
```

The old `notes` node is removed. No migration — sessions are short-lived.

### Rules

- `facilitator`: `.read` and `.write` only when
  `root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid`
  (set on the `facilitator` node itself).
  `$idx` validates: `notes` string ≤ 5000, `takeaway` string ≤ 300,
  `$other` false.
- `closed/$idx`: write by facilitator only, `newData.val() === true`.
  Readable by authenticated users (harmless, mirrors `state`).
- `votes/$idx` `.read` gains one alternative:
  facilitator **and** `root.child('sessions/' + $code + '/closed/' + $idx).exists()`.
  (A `$idx < currentCategoryIndex` check is not possible: `$idx` is a string, so
  comparison would be lexical — `"10" < "2"`.)

### Store (`sessionStore.ts`)

- `subscribeSession` attaches the `facilitator` and `closed` listeners only
  once `meta` is known and `meta.facilitatorId === uid` (participants would get
  `PERMISSION_DENIED`). `closed` may be listened to by everyone, but only the
  facilitator needs it.
- `nextCategory` writes atomically at the session root:
  `state/phase`, `state/currentCategoryIndex`, `closed/{current}: true`.
- `updateNotes` is replaced by
  `updateFacilitatorNote(session, idx, field: 'notes' | 'takeaway', value)`,
  writing `facilitator/{idx}/{field}`.

### Derived state (`deriveClientState.ts`, `types.ts`)

- `RawSession.notes` → `facilitator: Indexed<{ notes?: string; takeaway?: string }> | null`
  and `closed: Indexed<true> | null`.
- `ClientSessionState.notes` → `facilitatorNotes: Record<number, { notes: string; takeaway: string }>`
  (empty for participants).
- `CategoryResult` gains `takeaway`; `notes`/`takeaway` are filled only for the
  facilitator.
- New: `ClientSessionState.categoryResults: Record<number, Vote[]>` — votes for
  every index currently readable, so the notes page summary can show results
  for closed categories mid-session.
- `readableVoteIndexes(state, categoryCount, closed, isFacilitator)` adds the
  closed indexes for the facilitator.

## Exports

Markdown and PDF generation move from `SessionFinished.tsx` to
`src/lib/exportReport.ts` (pure Markdown generator + PDF builder). Per category,
a **Takeaway** line comes before the discussion notes. Buttons live only on the
notes page (finished phase). `SessionFinished` keeps the vote recap table and
drops the notes block and download buttons.

## Testing

- `deriveClientState.test.ts`:
  - participants get empty `facilitatorNotes` and no notes/takeaway in
    `allResults`;
  - facilitator gets notes + takeaway mapped per category;
  - `readableVoteIndexes` includes closed indexes for the facilitator only.
- New `exportReport.test.ts`: Markdown contains takeaway before notes, and
  omits both when empty.
- Rules: manual check — participant read of `facilitator` is denied, facilitator
  read of a closed category's votes mid-session succeeds, participant read of
  the same is denied.
- Manual run: open the notes window from the shared view, type notes in both
  windows, advance categories, finish, export.

## Out of scope

- Driving reveal/next from the notes window.
- Sharing takeaways with participants.
- Migrating existing `notes` data.

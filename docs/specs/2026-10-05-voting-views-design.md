# Presenter, Voting and Facilitator Views — Design

**Date:** 2026-10-05
**Status:** Approved in conversation, pending written-spec review

## Goal

Split the session into three views, one per audience:

- **Presenter view** — what the facilitator screen-shares: progress, the
  category, its health colours with their descriptions, the live vote count,
  then the results. No buttons, no notes.
- **Voting view** — what participants see on their phone: the vote form, which
  must fit on one phone screen without scrolling. No vote counter (it lives on
  the presenter view).
- **Facilitator view** — the session creator's control room: session controls,
  live round status, the current category's private notes, and their own vote
  form when they take part in the vote. Compact or full (dashboard) layout.

A new **introduction** step sits between the lobby and the first category to
present the workshop.

### Decisions (from the user)

- The presenter view is a **separate window in the facilitator's browser**, not
  a separate device.
- The facilitator view is **only available to the session creator**.
- The facilitator view has a **Compact / Full** toggle; Full is a dashboard
  showing the live round (including who has voted), participants with the
  "facilitator votes" setting, and session controls with export.
- During the session, notes are edited for the **current category only**. Once
  the session is finished, every category's note is listed and editable before
  export.
- The facilitator votes by default; this can be turned off in the lobby.
- The introduction uses **fixed, built-in content** (EN/FR), no facilitator text.

## Current state

- `/session/:code` renders the same `Lobby` / `VotingView` / `SessionFinished`
  for everyone; the facilitator sees extra buttons (start, reveal, next, end)
  inside those shared views.
- `/session/:code/notes` (`FacilitatorNotesPage`) is a popup with the current
  category's notes, a summary of past categories, and exports once finished.
- `VotingPanel` shows the vote form plus a "votes received" counter and the
  facilitator's reveal button.
- The facilitator joins with a name like everyone and always counts as a voter.

## Routes and access

| Route | Session creator (`meta/facilitatorId === uid`) | Anyone else |
|---|---|---|
| `/session/:code` | Join form (once), then **Facilitator view** | Join form, then **Voting view** |
| `/session/:code/present` | **Presenter view** | "Only the facilitator can open this" card linking back to `/session/:code` |
| `/session/:code/notes` | Redirect to `/session/:code` | Redirect to `/session/:code` |

- The creator still enters a name once, so they appear in `participants` (crown
  badge) and can vote.
- The presenter window does **not** join as a participant: it signs in, checks
  the session exists, and subscribes. It never inflates the head count.
- Restricting the presenter view to the creator is a UI rule (it shows nothing
  private). Private data stays protected by the database rules: `facilitator/*`
  is readable by the creator only, `state/*` writable by the creator only.
- "Open presenter window ↗" (in the facilitator view) calls
  `window.open(<base-aware url>, 'shc-present-<code>', 'popup,width=1280,height=800')`;
  the named target re-focuses an already-open window. If the browser blocks it,
  show the existing "allow popups" alert.
- The presenter window sets a distinct `document.title` (e.g.
  "Presenter — ABC123") so it is easy to pick in the screen-share dialog.
- `OpenNotesButton` is replaced by an `OpenPresenterButton` built the same way.

## Session phases

`SessionPhase` becomes `'lobby' | 'intro' | 'voting' | 'revealed' | 'finished'`.

| Transition | Trigger (facilitator view) |
|---|---|
| lobby → intro | "Start workshop" (needs ≥ 1 eligible voter, otherwise disabled with a hint) |
| intro → voting (category 0) | "Start first category" |
| voting → revealed | "Reveal now" (≥ 1 vote) or auto-reveal when every eligible voter has voted |
| revealed → voting (next category) | "Next category" |
| revealed → finished | "End session" (last category) |

## Presenter view

No buttons in any phase. Large type, suited to a shared screen.

| Phase | Content |
|---|---|
| lobby | Session code (large), QR code, share link as text, joined participants as badges |
| intro | Built-in introduction: what a squad health check is; the three colour cards (green / orange / red) with their generic meaning; the three trends; "votes are anonymous"; "N categories" with their names listed |
| voting | Navbar progress (category X/N), category name and subtitle, the three colour cards with this category's descriptions, "X of N votes received" with a progress bar (N = eligible voters) |
| revealed | Same header, the colour × trend results matrix in place of the vote bar |
| finished | Current recap: one card per category with its vote grid. No notes, no export |

## Voting view (participants)

| Phase | Content |
|---|---|
| lobby | "Waiting for the facilitator to start" (as today, without the share block) |
| intro | "The workshop is starting — watch the shared screen" with a compact legend of colours and trends |
| voting | Today's vote form, **without** the votes-received text/bar and **without** any reveal button. Must fit on one phone screen without scrolling. After submitting: "Vote submitted ✓ — waiting for the others" |
| revealed | "Results are on the shared screen" plus the results matrix (participants may read the revealed category's votes) |
| finished | Today's recap |

## Facilitator view

A **Compact / Full** toggle in the navbar. The choice is stored in
`localStorage` (wrapped in try/catch); without a stored value it defaults to
Full at ≥ 768px wide and Compact below.

### Building blocks

- **Controls** — the phase's action button (see the phase table), "Reveal now"
  during voting once at least one vote is in, and "Open presenter window ↗".
- **Live round** — "Category X/N", category name, votes-received bar, and
  voted / waiting chips for eligible voters (names only — from `voters/{idx}`
  and `participants`, both readable today). Never shows how anyone voted.
- **My vote** — shown only when `facilitatorVotes` is on and the phase is
  voting: the `VotingPanel` form; after submitting, "Vote submitted ✓".
- **Current note** — `NoteFields` for the current category (voting and revealed).
- **Results** — the colour × trend matrix of the current category (revealed).
- **Participants** — the list with crown / "you" badges, and the
  **"Facilitator votes"** switch: editable in the lobby, read-only afterwards.
- **Lobby extras** — session code and share link (so the facilitator can copy
  it without the presenter window).
- **Introduction** — a short reminder of what is on the shared screen and the
  "Start first category" button.
- **Finished** — every category with its results (`VoteSummary`) and an
  **editable** note, then Markdown / PDF export buttons.

### Layouts

- **Compact** — one column: controls, then live round → my vote (voting) or
  results (revealed) → current note. Participants only in the lobby.
- **Full** — two-column dashboard. Left: live round → my vote / results →
  current note. Right: controls → participants.
- Note editors appear once the facilitator's notes have loaded
  (`facilitatorNotesLoaded`), with a "Loading notes…" caption until then.
- Lobby (both layouts): participants with the switch, code and share link,
  "Start workshop".
- Finished (both layouts): the editable per-category list and export.

## Facilitator votes setting

- Stored as `state/facilitatorVotes` (boolean). `meta` is write-once, so the
  setting cannot live there. Absent means `true`, so existing sessions keep
  working. `createSession` writes `facilitatorVotes: true`.
- Changed only in the lobby (`setFacilitatorVotes` guards on phase).
- When off: the facilitator stays listed (crown badge) but is not an eligible
  voter — excluded from "X of N", from the voted / waiting chips, and from the
  auto-reveal condition. The facilitator view hides "My vote".

## Data model and rules

### Database

```
sessions/{code}/state: { phase, currentCategoryIndex, facilitatorVotes? }
```

No other node changes.

### Rules (`database.rules.json`)

- `state/phase` `.validate` adds `'intro'`.
- `state` gains `"facilitatorVotes": { ".validate": "newData.isBoolean()" }`
  (before `$other`).
- `voters/$idx/$uid` `.write` adds:
  `&& !(root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid && root.child('sessions/' + $code + '/state/facilitatorVotes').val() === false)`.
  The `votes` write already requires the matching `voters` entry in the same
  update, so the vote itself is denied too.

### Store (`sessionStore.ts`)

- `startWorkshop(s)` — facilitator, lobby → `phase: 'intro'`.
- `startVoting(s)` — now intro → `phase: 'voting'` (was lobby → voting).
- `setFacilitatorVotes(s, value)` — facilitator, lobby only.
- `createSession` writes `state: { phase: 'lobby', currentCategoryIndex: 0, facilitatorVotes: true }`.
- `submitVote`, `revealVotes`, `nextCategory`, `endSession`,
  `updateFacilitatorNote` unchanged.

### Derived state (`deriveClientState.ts`, `types.ts`)

- `SessionStateNode` gains `facilitatorVotes?: boolean`.
- `ClientSessionState`:
  - `facilitatorVotes: boolean` (absent → `true`);
  - `eligibleVoters: Participant[]` — participants, minus the facilitator when
    `facilitatorVotes` is false;
  - `voterIds: string[]` — ids of eligible voters who voted this round;
  - `totalParticipants` renamed **`totalVoters`** = `eligibleVoters.length`;
  - `voteCount` counts eligible voters only (`voterIds.length`).
- `shouldAutoReveal` uses `totalVoters`.
- `summaryIndexes` returns `[]` for `intro`, like `lobby`.

## Components

- `SessionPage` — keeps sign-in / join / subscription; picks
  `FacilitatorView` or `ParticipantView` by `session.isFacilitator`; keeps the
  auto-reveal effect and the connection banner.
- New `PresenterPage` (`/session/:code/present`) — sign-in, existence check,
  subscription, creator check, renders `PresenterView`.
- New `PresenterView`, `ParticipantView`, `FacilitatorView` (+ small block
  components where a file would otherwise grow large).
- Shared pieces reused: `ResultsGrid` (without its facilitator buttons — those
  move to the controls block), `VoteMatrix`, `VoteSummary`, `NoteFields`, the
  colour cards (extracted from `VotingView` into a `ColorCards` component),
  `HeaderSlot` progress.
- `VotingPanel` — becomes a pure form: drops `voteCount`,
  `totalParticipants`, `isFacilitator`, `onRevealVotes` and the progress block.
- Removed: `VotingView`, `Lobby` (split between presenter and facilitator),
  `FacilitatorNotesPage`, `OpenNotesButton`.
- `App.tsx` — adds the `/present` route; `/notes` becomes a redirect.
- `i18n.ts` — new EN/FR strings for the intro, presenter, participant waiting
  messages, facilitator controls, layout toggle and the switch. FR is typed as
  `Messages`, so `tsc` enforces parity.

## Testing

- `deriveClientState.test.ts`:
  - `facilitatorVotes` true / false / absent → `eligibleVoters`, `totalVoters`;
  - `voteCount` and `voterIds` ignore the facilitator's voter flag when they
    are not voting;
  - `shouldAutoReveal` fires when every non-facilitator voted and the
    facilitator does not vote;
  - `summaryIndexes` is empty in `intro`.
- `npm run build` (type-check, including i18n parity) and `npm test`.
- Rules, checked manually: facilitator vote denied when `facilitatorVotes` is
  false; `phase: 'intro'` and `facilitatorVotes` writes accepted from the
  creator, denied from a participant.
- Manual run:
  1. Create a session, join as facilitator, open the presenter window.
  2. Join from a phone; check the voting form fits without scrolling and has
     no counter.
  3. Turn "Facilitator votes" off in the lobby; start workshop → intro →
     first category; check "X of N" excludes the facilitator and auto-reveal
     fires.
  4. Go through categories, write notes, toggle Compact / Full.
  5. Finish; edit a past note; export Markdown and PDF.
  6. Open `/session/:code/present` and `/notes` as a participant; check the
     denial card and the redirect.

## Out of scope

- Presenter on a separate device or for anonymous viewers.
- Recovering the facilitator role from another browser or after clearing site
  data.
- Facilitator-authored introduction text.
- Editing past categories' notes before the session is finished.

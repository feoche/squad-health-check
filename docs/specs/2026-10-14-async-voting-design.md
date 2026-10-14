# Asynchronous Voting — Design

**Date:** 2026-10-14
**Status:** Approved

## Goal

Let the facilitator choose, when creating a session, to collect votes
**before** the meeting. Everyone receives the session code in advance and
votes on every category on their own time. The meeting is then spent viewing
the results of each category and discussing them, not voting live.

| Mode | Votes | Meeting |
|---|---|---|
| **Live** (default) | during the meeting, one category at a time | exists |
| **Async** | before the meeting, all categories | new: results and discussion only |

The mode is fixed once the session exists, like `anonymity` and `voteMode`.
Async is orthogonal to the vote mode: a session is colors or range, live or
async.

## Decisions

- **Lifecycle:** an open window the facilitator closes. There is no deadline.
- **Participant screen:** a stepper, one category at a time.
- **Late voters:** voting closes for good when the meeting starts.
- **Facilitator visibility while collecting:** participation only, never
  results.
- **Meeting:** reaching a category reveals it immediately, with no per-category
  Reveal step.

## Naming

`voteMode` already means colors or range. The new field is `state.mode`
(`'live' | 'async'`); the creation switch is labelled **Asynchronous voting**.

## Lifecycle

```
live:   lobby → intro → voting ⇄ revealed → … → finished
async:  collecting → revealed (cat 0) → revealed (cat 1) → … → finished
```

An async session is created directly in `collecting`: there is no lobby or intro.

- **`collecting`** (new phase, async only). Participants join with the code and
  vote on any category; they can edit their votes until the meeting starts.
- **Start the meeting.** The facilitator sets `phase: 'revealed'` and
  `currentCategoryIndex: 0`. Voting is then closed: vote writes require
  `collecting` (async) or `voting` (live).
- **Next Category** in async mode goes straight to `revealed` on the next
  index. There is no `voting` step. The existing `closed` write and read rules
  keep working.
- **Finish** is unchanged.

## Data model and rules (`database.rules.json`)

- `state.mode`: `'live' | 'async'`, immutable once set (same
  `!data.exists() || newData.val() === data.val()` pattern as `voteMode`).
  Absent means live, so existing sessions are unaffected.
- `state.phase` accepts `collecting`.
- `voters/<idx>/<uid>` and `ballots/<idx>/<uid>` writes are valid for any
  category index while `phase === 'collecting'`, instead of requiring
  `voting` on the current index. All the other conditions stay: the participant
  exists, the voter is not the facilitator when `facilitatorVotes` is false.
- Editing an own ballot (same `key`) and rewriting the matching
  `votes/<idx>/<key>` entry is allowed in `collecting` for any index, under the
  same key check as today.
- Reads: `votes` and `offlineVotes` stay unreadable while collecting (the read
  rules only open on `revealed`, `finished` or a closed category), so nobody,
  the facilitator included, sees results early. `voters` stays readable, which
  gives the participation count.
- Facilitator offline votes keep their current rule (`voting` or `revealed` on
  the current index); in async they are added during the meeting.
- Per `CLAUDE.md`, publish the rules to the live database and verify they are
  identical **before** pushing the app to `main`.

## UI

- **`CreateSession`:** an ODS Switch, off by default, labelled *Asynchronous
  voting*. When on, the confirmation tells the facilitator to send the code
  before the meeting.
- **Participant, `collecting`:** a new `CollectingView` stepper.
  - One category at a time, using the existing vote form (colors or range, plus
    trend), with Previous and Next.
  - A progress indicator ("3 of 8 answered").
  - A final review step listing each answer with an edit link and the
    categories still unanswered (no Submit button: each vote is saved as it is given).
  - Each vote is saved as it is given, so leaving halfway keeps progress; a
    returning participant lands on their answers and can edit them.
- **Participant, after the start:** today's revealed and ready-to-move-on views.
  A participant arriving late sees "voting is closed".
- **Facilitator, `collecting`:** a panel with participation per participant
  ("4 of 6 voted", plus n/N categories each) and a **Start the meeting**
  button. The button warns about incomplete participants and never blocks.
  There is no timer in async: the time per category setting is hidden at creation, and `roundStartedAt` and `roundStarts` are never written.
- **Presenter window, `collecting`:** a waiting screen with the session code and
  a participation count. After the start it behaves as today.

## Code touched

- `src/types.ts`: `mode`, `collecting` phase.
- `src/lib/sessionStore.ts`: create with mode, `startMeeting`, async-aware
  `nextCategory`, per-category vote and ballot writes outside the live round.
- `src/lib/deriveClientState.ts`: new phase and participation derivation.
- `database.rules.json`: as above.
- New components: `CollectingView`, a facilitator collecting panel.
- `src/lib/i18n.ts`: strings in French and English.
- `README.md`: a section on async mode and a manual-test checklist entry.
- `scripts/workshop-async.mjs` (a new script).

## Accessibility

Follows the project's WCAG 2.2 AA rules:

- Focus moves to the step heading on step change.
- `role="status"` announces "saved" and progress.
- Hidden strings exist in both languages.
- The ODS Switch has a visible label and a described state.

## Errors

- A failed vote write shows an inline, retryable error.
- A vote edit after the meeting starts is rejected by the rules and shown as
  "voting is closed".

## Testing

- Unit tests: `deriveClientState` (collecting phase, participation, per
  category counts), session store (create with mode, start the meeting, next
  category without a voting step), mode serialization.
- Rules checks in the manual checklist (Rules Playground): a vote write for a
  non-current index is allowed in a collecting session and denied in a live one;
  votes are unreadable while collecting; `state.mode` cannot be changed; a vote
  write after the meeting starts is denied.
- `workshop-async.mjs` end to end: an async session where participants vote before the
  facilitator starts the meeting, then the results are walked through, with axe
  on every view.

## Out of scope

- A voting deadline or automatic closing.
- Reminders or notifications to participants.
- Late voting during the meeting.
- Switching a session between live and async after creation.

# Session Settings at Creation — Design

**Date:** 2026-10-06
**Status:** Approved in conversation, pending written-spec review

## Goal

Let the facilitator choose two settings on the session creation page:

| Setting | Values | Default | Today |
|---|---|---|---|
| Facilitator takes part in the vote | on / off | on | exists (`state.facilitatorVotes`), toggled in the lobby |
| Vote anonymization | off / facilitator only / full | **off** | votes are always anonymous (= full) |

Anonymization levels:

- **Off** — everyone sees who voted what once a round is revealed.
- **Facilitator only** — votes are anonymous to everyone except the
  facilitator: the facilitator sees who voted what once a round is revealed;
  participants and the shared presenter screen only see totals.
- **Full** — nobody sees who voted what (today's behaviour).

Both settings are fixed once the session exists. The lobby toggle for the
facilitator's vote goes away.

While a round is being voted, nobody — facilitator included — sees names.

## Data model

`state` gains `anonymity: 'off' | 'facilitator' | 'full'` next to
`facilitatorVotes`. Both are written by `createSession` and never again.

- Absent `facilitatorVotes` → `true` (unchanged).
- Absent `anonymity` → `'full'`, so sessions created before this change stay
  anonymous.

Named votes reuse the existing private ballots (`ballots/{idx}/{uid}` →
`{ key, color, trend }`). A ballot always mirrors its voter's current vote, since
both are written in the same update. No new path is added; named sessions only
make ballots readable to more people.

## Rules (`database.rules.json`)

- `state/facilitatorVotes` (`newData.isBoolean()`) and `state/anonymity`
  (`'off'`, `'facilitator'` or `'full'`) keep their type/value checks, but the
  write-once lock is enforced on the parent `state` node: its `.validate`
  requires, whenever `state` already exists, that `anonymity` and
  `facilitatorVotes` equal their existing values. Child `.validate` rules do not
  run on deletion, so this parent check is what also forbids deleting a setting
  and re-adding another value (legacy sessions with both absent stay absent).
- `ballots/$idx` gets a `.read` granted when either:
  - `state/anonymity === 'off'` and (`phase === 'finished'` or
    (`phase === 'revealed'` and `$idx` is the current category)); or
  - `state/anonymity` is `'off'` or `'facilitator'`, the reader is the
    facilitator, and (`phase === 'finished'`, or `$idx` is revealed and
    current, or `closed/$idx` exists).

  Values are compared explicitly, so an absent `anonymity` denies. The existing
  per-`$uid` read (own ballot) stays.
- Rules must be published before the app is pushed (README step 5).

## Client

### Creation form (`CreateSession.tsx`)

A "Session settings" section above the start button:

- an ODS `Toggle` "I take part in the vote" (on);
- an ODS `RadioGroup` "Vote anonymization" with the three levels (off
  selected), each with a one-line description.

`createSession(categories, { facilitatorVotes, anonymity })` writes them into
`state`.

### Lobby (`ParticipantsPanel`)

The facilitator-votes toggle, `setFacilitatorVotes` (store, `SessionPage`,
`FacilitatorActions`) and their strings are removed. The panel shows both
settings as read-only text (e.g. "You take part in the vote · Votes visible to
the facilitator only").

### Store and derived state

- `SessionStateNode` gains `anonymity?: Anonymity`.
- `RawSession` gains `roundBallots: Record<string, Record<string, Ballot>>`
  (everyone's ballots per category, distinct from the user's own `ballots`).
- `readableBallotIndexes(state, categoryCount, closed, isFacilitator)` mirrors
  the rule: `[]` when `full`, or when `facilitator` and the user isn't the
  facilitator. `subscribeSession` attaches a `ballots/{i}` listener per readable
  index, like the vote listeners (a cancelled listener is dropped and
  re-attached later).
- `ClientSessionState` gains:
  - `anonymity: Anonymity`;
  - `namedVotes: Record<number, NamedVote[]>` with
    `NamedVote = { id, name, vote }`, sorted by name; ballots whose voter is no
    longer in `participants` are shown with a fallback name.

### Results

A `NamedVotes` component (name, colour badge, trend icon per row) is rendered
under the vote matrix when `namedVotes[index]` exists:

| View | off | facilitator only |
|---|---|---|
| Facilitator view (revealed round, finished notes) | names | names |
| Presenter view (screen-shared) | names | **no names** |
| Participant view (revealed round, finished) | names | no results on participant phones (the shared screen shows them), so names are not loaded |

The presenter page runs as the facilitator, so it can read ballots in
facilitator-only sessions; it must explicitly hide names unless
`anonymity === 'off'`.

### Export (`exportReport.ts`)

The export is facilitator-only. When named votes are present for a category
(`off` or `facilitator`), the Markdown and PDF list each person with their
colour and trend under that category's counts.

### Wording

- Intro bullet / presenter script "Votes are anonymous…" follow `anonymity`:
  - off: "Votes are named: everyone sees who voted what once the round is
    revealed."
  - facilitator: "Votes are anonymous to the team; only the facilitator sees who
    voted what."
  - full: unchanged.
- Home page feature line becomes "Anonymous or named votes — the facilitator
  chooses".
- The participant voting view shows a short notice when `anonymity` is not
  `full`, so voters know who will see their vote before voting.
- All new strings in English and French.

## Testing

- `deriveClientState`: `anonymity` defaults to `'full'`; `namedVotes` maps
  ballots to participant names, is empty when `full`, handles departed voters.
- `readableBallotIndexes`: empty when `full`; empty for participants when
  `facilitator`; otherwise matches the rule (revealed current, closed for the
  facilitator, all when finished, none while voting).
- `exportReport`: names included only when present.
- Rules: manual check with the Rules Playground, added to the README manual
  test list:
  - reading `ballots/<current>` during voting is denied for everyone;
  - after reveal: allowed for a participant when `off`, denied when
    `facilitator` or `full`; allowed for the facilitator when `off` or
    `facilitator`, denied when `full`;
  - writing `state/anonymity` or `state/facilitatorVotes` on an existing
    session is denied.

## Out of scope

- Changing settings after creation.
- Showing names live during voting.

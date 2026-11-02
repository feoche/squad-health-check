# Range Vote Mode — Design

**Date:** 2026-10-13
**Status:** Approved, implemented

## Goal

Let the facilitator choose, when creating a session, how people vote:

| Mode | Vote | Today |
|---|---|---|
| **Colors** (default) | a color (green / orange / red) and a trend | exists |
| **Range** | a score from 1 to 9 and a trend | new |

Range is not colors in disguise: **no color exists anywhere in a Range
session** (storage, voting, results, exports, fun facts). A score carries
another nuance than a color. The category's red wording stands for 1 and its
green wording for 9; the trend stays.

The mode is fixed once the session exists, like `anonymity`.

## Data model

- `state.voteMode: 'colors' | 'range'`, written by `createSession`, never
  changed. Absent → `'colors'` (sessions created before the setting).
- `Vote` is a union: `{ color, trend }` (unchanged) or `{ score, trend }` with
  `score` an integer 1–9. A vote never carries both. A `isRangeVote` type
  guard tells them apart. The same shapes are used for the anonymous vote and
  the private ballot (`Ballot` = vote + `key`).
- Offline votes (added by the facilitator for people without the app) are
  stored at `offlineVotes/{idx}/{score}/{trend}` in Range sessions, and stay at
  `{color}/{trend}` in Colors sessions. `expandOfflineVotes` handles both.
- `voteScore.ts`: `voteWeight` of a Range vote is its score; the median of a
  Range session is the median of scores (a half with an even count, e.g. 5.5).
  `scoreCell` (weight → color/trend) is not used for Range.
- `ClientSessionState` gains `voteMode`. Results typed `Vote[]` stay unions;
  consumers narrow with the guard or read `state.voteMode`.
- The previous-session comparison only compares medians between sessions of
  the same mode.

## Rules (`database.rules.json`)

- `state/voteMode` validates `'colors'` or `'range'`; the write-once lock sits
  on the parent `state` node next to `anonymity` / `facilitatorVotes`.
- `votes/$idx/$key` and `ballots/$idx/$uid` accept `color`+`trend` when
  `voteMode` is `colors` or absent, and `score`+`trend` when it is `range`.
  A color in a Range session, or a score in a Colors one, is rejected.
  `score`: `isNumber()`, integer, 1–9.
- `offlineVotes/$idx/$key`: keys `green|orange|red` only in Colors sessions,
  `1`–`9` only in Range sessions; counts keep the existing 0–15 integer check.
- Per CLAUDE.md, publish the rules and verify the live copy **before** pushing
  the app to `main`.

## Creation form and lobby

- `CreateSession`: a "Vote mode" ODS `RadioGroup` (Colors default, Range 1–9),
  each option with a one-line description, in the session settings section.
- `SessionSettings` gains `voteMode`; `DEFAULT_SESSION_SETTINGS` uses `colors`.
- `ParticipantsPanel` shows the mode read-only with the other settings.

## Voting

- `VotingPanel` in Range mode replaces the color tiles with an ODS `Range`
  (min 1, max 9, step 1) and a visible value.
  - The category's `negativeDescription` is shown at the 1 end,
    `positiveDescription` at the 9 end, with the generic fallbacks when empty.
  - No preselected value: until the voter moves it, submitting shows the
    "pick a score" error and focuses the Range.
  - The trend picker is unchanged. Editing a vote preselects its score.
- Shared-screen intro (`ColorCards`, `IntroContent`): in Range mode show the
  1 and 9 wording instead of three color cards.
- Accessibility (README › Accessibility, WCAG 2.2 AA): the Range has an
  accessible name and a text value; focus handling follows the existing form;
  both languages for hidden strings.

## Results

- `ScoreHistogram` replaces `VoteMatrix`/`ResultsGrid` in Range sessions, in
  the facilitator, presenter and participant views and on the finished screen.
  Nine bars (1–9) with counts, the median marked, and a trend strip below:
  ↗ improving · → stable · ↘ worsening counts.
- The facilitator's offline "+/−" controls sit under each bar. A vote needs a
  score *and* a trend, so a small trend selector (↗ → ↘, default stable) sets
  the trend of the votes added with "+"; "−" removes an added vote of that
  score, preferring the selected trend.
- `NamedVotes`: score number and trend arrow per voter, no color badge.
- `MedianBadge`: shows the score, uncolored. `VoteSummary` follows.
- The histogram is readable without color alone and exposes its counts to
  assistive tech (text alternative or table), like the matrix.

## Exports

- Markdown and PDF list per-score counts and trend counts for Range sessions;
  named votes show score and trend. PDF text is tagged and decorations are
  artifacts (PDF/UA-1); validate with veraPDF.
- `public/session-export.schema.json` gains `voteMode` and `score`, and
  describes both vote shapes.

## Fun facts (Range mode)

Each stat keeps one definition, now computed per mode. Stats that read only
medians, spread, trends, gaps to the median or vote times work in both modes
unchanged: `sunnySide`, `stormCloud`, `hotDebate`, `choir`, `lookingUp`,
`slidingDown`, `risingStar`, `steady`, `voiceCount`, `devilsAdvocate`,
`teamMirror`, `worrier`, `believer` and all seven speed stats.

The color-based stats are **not shown** in Range mode and get Range-specific
counterparts (thresholds are plain numbers, no color is derived). Proposed set
(each hides itself when it has no meaningful winner, like today):

| Id | Group | Meaning | Value |
|---|---|---|---|
| `teamAverage` | team | mean score over all votes (≥ MIN_VOTES) | `6.4/9` |
| `topMarks` | team | category with the most 9s (≥ 2) | count |
| `rockBottom` | team | category with the most 1s (≥ 2) | count |
| `bullseye` | team | a category (≥ 3 votes) where everybody gave the same score | the score |
| `rubberBand` | team | category with the widest min→max gap (≥ 6) | `2 → 9` |
| `highFloor` | team | lowest score given in the whole session is ≥ 4 | the score |
| `sunnyAverage` / `gloomyAverage` | person | highest / lowest personal mean score (replace `optimisticOtter` / `pessimisticPal`) | `7.3/9` |
| `allOrNothing` | person | most votes at the extremes (1 or 9), ≥ 2 | count |
| `middleGround` | person | most 5s (≥ 2) | count |
| `nineLives` | person | most 9s (≥ 2) | count |
| `oneTrickPony` | person | gave the same score in ≥ 75% of ≥ 4 rounds | `7 · 5/6` |
| `rollercoaster` | person | widest personal spread of scores | `2 → 9` |

Same rules as today: person stats need named votes and at least half the
rounds played by that person, and at least `MIN_PEOPLE` people; the finished
screen still shows `FUN_STATS_SHOWN` random eligible stats, seeded per session.
`FUN_STAT_IDS` is split into the stats valid per mode; strings exist in FR and
EN (`funStats` in `i18n.ts`).

## Testing

- Unit: `isRangeVote`, Range weight and median (even/odd counts),
  `expandOfflineVotes` in both modes, each Range fun stat (winner, tie →
  hidden, below thresholds → hidden), export and serialize round trips with
  `voteMode`, session-history comparison across modes.
- Rules: Range and Colors votes/ballots/offline votes accepted and cross-mode
  ones rejected; `voteMode` write-once.
- UI: voting in Range (validation error, edit, keyboard), histogram with
  offline controls, creation form, in FR and EN.
- PDF validated with veraPDF (`--flavour ua1`).

## Out of scope

Changing the mode after creation; mixing modes within a session; a range
other than 1–9; converting between modes in the previous-session comparison.

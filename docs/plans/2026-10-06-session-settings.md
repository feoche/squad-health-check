# Session Settings at Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choose "facilitator takes part in the vote" and a three-level vote anonymization on the session creation page, and show who voted what where the level allows it.

**Architecture:** Both settings live in `state` (`facilitatorVotes`, `anonymity`), are written once by `createSession` and locked by the database rules. Named votes reuse the existing private ballots (`ballots/{idx}/{uid}`): the rules open them to the allowed readers after reveal, the store listens to `ballots/{idx}` where readable, and `deriveClientState` turns them into `namedVotes`.

**Tech Stack:** React 18 + TypeScript, `@ovhcloud/ods-react` 19.7, Firebase Realtime Database + rules, Vitest.

**Spec:** `docs/specs/2026-10-06-session-settings-design.md`

## Global Constraints

- Anonymization values: `'off' | 'facilitator' | 'full'`; default on the creation form `'off'`; absent in the database → `'full'`.
- `facilitatorVotes` default on the creation form `true`; absent in the database → `true`.
- Both settings are write-once (rules) and never changed by the client after `createSession`.
- Nobody — facilitator included — sees names while a round is being voted.
- With `'facilitator'`, names never appear on the presenter window (it runs as the facilitator, so it must filter explicitly).
- Every new user-facing string exists in `en` and `fr` (`src/lib/i18n.ts`; `fr` is typed by `en`, so a missing key fails the build).
- Commits: conventional `feat:` / `docs:` subjects, no Claude references, no `Co-Authored-By` line.
- Run tests with `npm test`, type-check and build with `npm run build`.

## Review Focus

- **Session created before this change** (no `anonymity` in `state`): must behave as `'full'` — no ballot listeners, no names anywhere. Pinned in Task 1.
- **Facilitator-only session on the presenter window**: the presenter page signs in as the facilitator and can read ballots; names must still not render there. Pinned by `sharedNamedVotes` tests in Task 1.
- **A ballot whose voter is missing from `participants`**: must render with a fallback name instead of crashing or showing a uid. Pinned in Task 1.
- **Anonymity `'full'` with ballots somehow present in the raw data**: `namedVotes` must stay empty. Pinned in Task 1.
- **Facilitator who doesn't vote**: their name must not appear in named votes (they have no ballot) and the setting must be locked after creation. Pinned by the `readableBallotIndexes` tests in Task 1 and the manual rules checks in Task 2.

---

## File Structure

- `src/types.ts` — `ANONYMITY_LEVELS`, `Anonymity`, `SessionSettings`, `NamedVote`; `ClientSessionState` gains `anonymity`, `namedVotes`.
- `src/lib/deriveClientState.ts` — `anonymity` default, `namedVotes`, `readableBallotIndexes`, `sharedNamedVotes`.
- `src/lib/sessionStore.ts` — `createSession(categories, settings)`, round ballot listeners, `setFacilitatorVotes` removed.
- `database.rules.json` — write-once settings, `ballots/$idx` read.
- `src/pages/CreateSession.tsx` — settings card.
- `src/components/facilitator/ParticipantsPanel.tsx` — read-only settings line.
- `src/components/NamedVotes.tsx` (new) — the per-person list.
- `src/components/ResultsGrid.tsx`, `PresenterView.tsx`, `SessionFinished.tsx`, `facilitator/FacilitatorView.tsx`, `facilitator/FinishedNotes.tsx` — render named votes.
- `src/lib/exportReport.ts` — names in Markdown and PDF.
- `src/components/IntroContent.tsx`, `ParticipantView.tsx`, `src/lib/i18n.ts` — wording.
- `README.md` — features and manual checks.

---

### Task 1: Data model and derived state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/deriveClientState.ts`
- Modify: `src/lib/sessionStore.ts:262-271` (only the `raw` initialiser, so the build stays green)
- Modify: `src/lib/exportReport.test.ts:885-910` (test helper gains the new fields)
- Test: `src/lib/deriveClientState.test.ts`

**Interfaces:**
- Produces:
  - `ANONYMITY_LEVELS: readonly ['off', 'facilitator', 'full']`, `type Anonymity`, `interface SessionSettings { facilitatorVotes: boolean; anonymity: Anonymity }`, `interface NamedVote { id: string; name: string | null; vote: Vote }` in `src/types.ts`.
  - `ClientSessionState.anonymity: Anonymity`, `ClientSessionState.namedVotes: Record<number, NamedVote[]>`.
  - `SessionStateNode.anonymity?: Anonymity`; `RawSession.roundBallots: Record<string, Record<string, Ballot> | null>`.
  - `readableBallotIndexes(state: SessionStateNode, categoryCount: number, closed?: Indexed<true> | null, isFacilitator?: boolean): number[]`
  - `sharedNamedVotes(session: Pick<ClientSessionState, 'anonymity' | 'namedVotes'>, index: number): NamedVote[] | undefined`

- [ ] **Step 1: Add the shared types**

In `src/types.ts`, after `export type VoteTrend = …;` add:

```ts
/** Who sees who voted what, once a round is revealed */
export const ANONYMITY_LEVELS = ['off', 'facilitator', 'full'] as const;
export type Anonymity = (typeof ANONYMITY_LEVELS)[number];

/** Chosen when creating the session, fixed afterwards (see database.rules.json) */
export interface SessionSettings {
  facilitatorVotes: boolean;
  anonymity: Anonymity;
}
```

After `interface Participant` add:

```ts
/** A revealed vote with its voter, in sessions that are not fully anonymous */
export interface NamedVote {
  id: string;
  /** Null when the voter is no longer in the participant list */
  name: string | null;
  vote: Vote;
}
```

In `ClientSessionState`, after `facilitatorVotes: boolean;` add:

```ts
  /** Absent in the database means 'full' (sessions created before the setting existed) */
  anonymity: Anonymity;
```

and after `categoryResults: Record<number, Vote[]>;` add:

```ts
  /** Votes with their voter, by category index, for the categories whose ballots this user may read */
  namedVotes: Record<number, NamedVote[]>;
```

- [ ] **Step 2: Write the failing tests**

In `src/lib/deriveClientState.test.ts`:

Add `readableBallotIndexes` and `sharedNamedVotes` to the import from `./deriveClientState`, and add `roundBallots: {},` to the `raw()` helper after `ballots: {},`.

Append inside `describe('deriveClientState', …)` (before its closing `});`):

```ts
  describe('anonymity and named votes', () => {
    const revealed = { phase: 'revealed' as const, currentCategoryIndex: 0 };
    const ballot = (color: 'green' | 'red', trend: 'up' | 'down') => ({ key: 'k'.repeat(20), color, trend });

    it("defaults to 'full' when the setting is absent", () => {
      expect(deriveClientState('ABC234', raw(), 'fac')!.anonymity).toBe('full');
    });

    it('maps ballots to participant names, sorted by name', () => {
      const s = deriveClientState(
        'ABC234',
        raw({
          state: { ...revealed, anonymity: 'off' },
          roundBallots: { '0': { fac: ballot('red', 'down'), bob: ballot('green', 'up') } },
        }),
        'bob',
      )!;
      expect(s.anonymity).toBe('off');
      expect(s.namedVotes).toEqual({
        0: [
          { id: 'fac', name: 'Alice', vote: { color: 'red', trend: 'down' } },
          { id: 'bob', name: 'Bob', vote: { color: 'green', trend: 'up' } },
        ],
      });
    });

    it('keeps a ballot whose voter left, with no name, listed last', () => {
      const s = deriveClientState(
        'ABC234',
        raw({
          state: { ...revealed, anonymity: 'facilitator' },
          roundBallots: { '0': { gone: ballot('red', 'up'), bob: ballot('green', 'up') } },
        }),
        'fac',
      )!;
      expect(s.namedVotes[0].map((v) => v.name)).toEqual(['Bob', null]);
    });

    it('treats a loaded, empty round as no named votes yet', () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...revealed, anonymity: 'off' }, roundBallots: { '0': null } }),
        'fac',
      )!;
      expect(s.namedVotes).toEqual({ 0: [] });
    });

    it("never names votes in a 'full' session, even with ballots loaded", () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...revealed, anonymity: 'full' }, roundBallots: { '0': { bob: ballot('green', 'up') } } }),
        'fac',
      )!;
      expect(s.namedVotes).toEqual({});
    });
  });
```

Append at the end of the file:

```ts
describe('readableBallotIndexes', () => {
  const revealed = (anonymity?: 'off' | 'facilitator' | 'full') => ({
    phase: 'revealed' as const,
    currentCategoryIndex: 2,
    anonymity,
  });

  it("reads nothing in 'full' sessions or when the setting is absent", () => {
    expect(readableBallotIndexes(revealed('full'), 3, { '0': true }, true)).toEqual([]);
    expect(readableBallotIndexes(revealed(), 3, { '0': true }, true)).toEqual([]);
  });

  it('reads nothing while a round is being voted', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 1, anonymity: 'off' as const };
    expect(readableBallotIndexes(voting, 3, null, true)).toEqual([]);
    expect(readableBallotIndexes(voting, 3, null, false)).toEqual([]);
  });

  it("lets everyone read the revealed round in 'off' sessions, plus closed rounds for the facilitator", () => {
    expect(readableBallotIndexes(revealed('off'), 3, { '0': true }, false)).toEqual([2]);
    expect(readableBallotIndexes(revealed('off'), 3, { '0': true }, true)).toEqual([0, 2]);
  });

  it("lets only the facilitator read in 'facilitator' sessions", () => {
    expect(readableBallotIndexes(revealed('facilitator'), 3, { '0': true }, true)).toEqual([0, 2]);
    expect(readableBallotIndexes(revealed('facilitator'), 3, { '0': true }, false)).toEqual([]);
  });

  it('reads every category when finished', () => {
    const finished = { phase: 'finished' as const, currentCategoryIndex: 0, anonymity: 'off' as const };
    expect(readableBallotIndexes(finished, 3)).toEqual([0, 1, 2]);
  });
});

describe('sharedNamedVotes', () => {
  const named = { 0: [{ id: 'bob', name: 'Bob', vote: { color: 'green' as const, trend: 'up' as const } }] };

  it("shows names on shared screens only in 'off' sessions", () => {
    expect(sharedNamedVotes({ anonymity: 'off', namedVotes: named }, 0)).toEqual(named[0]);
    expect(sharedNamedVotes({ anonymity: 'facilitator', namedVotes: named }, 0)).toBeUndefined();
    expect(sharedNamedVotes({ anonymity: 'full', namedVotes: named }, 0)).toBeUndefined();
  });

  it('is undefined for a category without loaded ballots', () => {
    expect(sharedNamedVotes({ anonymity: 'off', namedVotes: named }, 1)).toBeUndefined();
  });
});
```

In `src/lib/exportReport.test.ts`, in the object returned by `finished()`, add after `facilitatorVotes: true,`:

```ts
    anonymity: 'full',
```

and after `categoryResults: {},`:

```ts
    namedVotes: {},
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/deriveClientState.test.ts`
Expected: FAIL — `readableBallotIndexes` / `sharedNamedVotes` are not exported, and `anonymity` is undefined.

- [ ] **Step 4: Implement**

In `src/lib/deriveClientState.ts`:

Extend the type import:

```ts
import {
  Anonymity,
  Ballot,
  Category,
  CategoryResult,
  ClientSessionState,
  FacilitatorNote,
  NamedVote,
  SessionPhase,
  Vote,
} from '../types';
```

In `SessionStateNode`, after `facilitatorVotes?: boolean;` add:

```ts
  /** Absent in sessions created before the setting existed: counts as 'full' */
  anonymity?: Anonymity;
```

In `RawSession`, after `ballots: Record<string, Ballot | null>;` add:

```ts
  /** Everyone's ballots per category index, where the rules allow reading them (see readableBallotIndexes) */
  roundBallots: Record<string, Record<string, Ballot> | null>;
```

After `function myVote(…) {…}` add:

```ts
/** By name, voters who left (no name) last */
const byName = (a: NamedVote, b: NamedVote) =>
  a.name === null ? (b.name === null ? 0 : 1) : b.name === null ? -1 : a.name.localeCompare(b.name);
```

In `deriveClientState`, after `const voterIds = …;` add:

```ts
  const anonymity: Anonymity = raw.state.anonymity ?? 'full';
  const names = new Map(participants.map((p) => [p.id, p.name]));
  const namedVotes: Record<number, NamedVote[]> = {};
  if (anonymity !== 'full') {
    categories.forEach((_, i) => {
      const ballots = raw.roundBallots[String(i)];
      if (ballots === undefined) return;
      namedVotes[i] = Object.entries(ballots ?? {})
        .map(([id, b]) => ({ id, name: names.get(id) ?? null, vote: { color: b.color, trend: b.trend } }))
        .sort(byName);
    });
  }
```

In the returned object, after `facilitatorVotes,` add `anonymity,` and after `categoryResults,` add `namedVotes,`.

After `readableVoteIndexes` add:

```ts
/**
 * Ballot indexes the rules allow reading in sessions that are not fully anonymous:
 * the revealed round, closed rounds for the facilitator, everything once finished —
 * for everyone when 'off', for the facilitator only when 'facilitator'. Never while voting.
 */
export function readableBallotIndexes(
  state: SessionStateNode,
  categoryCount: number,
  closed: Indexed<true> | null = null,
  isFacilitator = false,
): number[] {
  const allowed = state.anonymity === 'off' || (state.anonymity === 'facilitator' && isFacilitator);
  if (!allowed) return [];
  const all = Array.from({ length: categoryCount }, (_, i) => i);
  if (state.phase === 'finished') return all;
  return all.filter(
    (i) =>
      (state.phase === 'revealed' && i === state.currentCategoryIndex) ||
      (isFacilitator && at(closed, i) === true),
  );
}

/** Names on shared screens (presenter window): only when votes are not anonymous at all. */
export function sharedNamedVotes(
  session: Pick<ClientSessionState, 'anonymity' | 'namedVotes'>,
  index: number,
): NamedVote[] | undefined {
  return session.anonymity === 'off' ? session.namedVotes[index] : undefined;
}
```

In `src/lib/sessionStore.ts`, in the `raw` initialiser of `subscribeSession`, add after `ballots: {},`:

```ts
    roundBallots: {},
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts src/lib/exportReport.test.ts src/lib/sessionStore.ts
git commit -m "feat: derive named votes from readable ballots"
```

---

### Task 2: Rules and store

**Files:**
- Modify: `database.rules.json` (`state` and `ballots` nodes)
- Modify: `src/lib/sessionStore.ts`
- Modify: `src/pages/SessionPage.tsx:136`
- Modify: `src/components/facilitator/FacilitatorView.tsx:71,168`
- Modify: `src/components/facilitator/ParticipantsPanel.tsx`
- Modify: `src/pages/CreateSession.tsx:118` (temporary call with defaults, replaced in Task 3)
- Modify: `src/lib/i18n.ts` (`facilitator` section in `en` and `fr`, new `settings` section)

**Interfaces:**
- Consumes: `SessionSettings`, `readableBallotIndexes`, `RawSession.roundBallots` (Task 1).
- Produces:
  - `createSession(categories: Category[], settings: SessionSettings): Promise<string>`
  - `DEFAULT_SESSION_SETTINGS: SessionSettings` (`{ facilitatorVotes: true, anonymity: 'off' }`) exported from `src/lib/sessionStore.ts`.
  - `t.settings` = `{ title, facilitatorVotes, anonymity, levels: Record<Anonymity, string>, levelHints: Record<Anonymity, string>, youVote, youDontVote }`.
  - `FacilitatorActions` without `setFacilitatorVotes`; `ParticipantsPanel` takes only `{ session }`.

- [ ] **Step 1: Lock the settings and open ballots in the rules**

In `database.rules.json`, under `state`, replace the `facilitatorVotes` line with:

```json
          "facilitatorVotes": { ".validate": "newData.isBoolean() && (!data.exists() || newData.val() === data.val())" },
          "anonymity": { ".validate": "(newData.val() === 'off' || newData.val() === 'facilitator' || newData.val() === 'full') && (!data.exists() || newData.val() === data.val())" },
```

Under `ballots`, add a `.read` on `$idx`, before `"$uid"`:

```json
          ".read": "auth != null && (root.child('sessions/' + $code + '/state/anonymity').val() === 'off' || (root.child('sessions/' + $code + '/state/anonymity').val() === 'facilitator' && root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid)) && (root.child('sessions/' + $code + '/state/phase').val() === 'finished' || (root.child('sessions/' + $code + '/state/phase').val() === 'revealed' && root.child('sessions/' + $code + '/state/currentCategoryIndex').val() + '' === $idx) || (root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid && root.child('sessions/' + $code + '/closed/' + $idx).exists()))",
```

Check the file is still valid JSON:

Run: `node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8'))" && echo ok`
Expected: `ok`

- [ ] **Step 2: Write settings in `createSession` and drop `setFacilitatorVotes`**

In `src/lib/sessionStore.ts`:

Change the types import to include `SessionSettings`, and the `deriveClientState` import to include `readableBallotIndexes`:

```ts
import { Ballot, Category, ClientSessionState, FacilitatorNote, SessionSettings, Vote } from '../types';
…
import {
  RawSession,
  at,
  deriveClientState,
  readableBallotIndexes,
  readableVoteIndexes,
} from './deriveClientState';
```

Above `createSession` add:

```ts
export const DEFAULT_SESSION_SETTINGS: SessionSettings = { facilitatorVotes: true, anonymity: 'off' };
```

Replace the signature and the `state` line of `createSession`:

```ts
/** Settings are written once here: the rules refuse any later change */
export async function createSession(categories: Category[], settings: SessionSettings): Promise<string> {
```

```ts
        state: { phase: 'lobby', currentCategoryIndex: 0, ...settings },
```

Delete `setFacilitatorVotes` (the function and its doc comment).

- [ ] **Step 3: Listen to everyone's ballots where readable**

In `subscribeSession`, after `const voteUnsubs = new Map<number, Unsubscribe>();` add:

```ts
  const roundBallotUnsubs = new Map<number, Unsubscribe>();
```

After `syncVoteListeners` add:

```ts
  /* Everyone's ballots, in sessions that are not fully anonymous and only where the rules allow */
  const syncRoundBallotListeners = () => {
    if (!raw.meta || !raw.state) return;
    const readable = readableBallotIndexes(
      raw.state,
      raw.meta.categories.length,
      raw.closed,
      isFacilitator(),
    );
    for (const i of readable) {
      if (roundBallotUnsubs.has(i)) continue;
      roundBallotUnsubs.set(
        i,
        onValue(
          sessionRef(code, `ballots/${i}`),
          (snap: DataSnapshot) => {
            raw.roundBallots[String(i)] = snap.val() as Record<string, Ballot> | null;
            emit();
          },
          (err: Error) => {
            // Expected for participants once the round is closed: keep cached data, re-attach when finished
            roundBallotUnsubs.delete(i);
            warnCancelled(`ballots/${i}`)(err);
          },
        ),
      );
    }
  };
```

In `listen`, replace:

```ts
          if (key !== 'participants' && key !== 'facilitator') syncVoteListeners();
```

with:

```ts
          if (key !== 'participants' && key !== 'facilitator') {
            syncVoteListeners();
            syncRoundBallotListeners();
          }
```

In the returned cleanup, after `voteUnsubs.forEach((u) => u());` add:

```ts
    roundBallotUnsubs.forEach((u) => u());
```

- [ ] **Step 4: Settings strings**

In `src/lib/i18n.ts`, `en.facilitator`: delete `facilitatorVotes` and `facilitatorVotesHint`. Add a new section after `create: {…},`:

```ts
  settings: {
    title: 'Session settings',
    facilitatorVotes: 'I take part in the vote',
    anonymity: 'Vote anonymization',
    levels: { off: 'Off', facilitator: 'Facilitator only', full: 'Full' },
    levelHints: {
      off: 'Everyone sees who voted what once a round is revealed.',
      facilitator: 'Only you see who voted what once a round is revealed; the team sees totals.',
      full: 'Nobody sees who voted what, only totals.',
    },
    youVote: 'You take part in the vote',
    youDontVote: "You don't take part in the vote",
  },
```

In `fr.facilitator`: delete `facilitatorVotes` and `facilitatorVotesHint`. Add after `create: {…},`:

```ts
  settings: {
    title: 'Paramètres de la session',
    facilitatorVotes: 'Je participe au vote',
    anonymity: 'Anonymisation des votes',
    levels: { off: 'Désactivée', facilitator: 'Facilitateur uniquement', full: 'Complète' },
    levelHints: {
      off: "Tout le monde voit qui a voté quoi une fois la manche révélée.",
      facilitator: "Vous seul voyez qui a voté quoi une fois la manche révélée ; l'équipe voit les totaux.",
      full: 'Personne ne voit qui a voté quoi, seulement les totaux.',
    },
    youVote: 'Vous participez au vote',
    youDontVote: 'Vous ne participez pas au vote',
  },
```

- [ ] **Step 5: Read-only settings in the lobby panel**

Replace `src/components/facilitator/ParticipantsPanel.tsx` with:

```tsx
import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';
import ParticipantBadges from '../ParticipantBadges';

/** Settings were chosen at creation and can't change, so they are only shown here. */
function ParticipantsPanel({ session }: { session: ClientSessionState }) {
  return (
    <Card className="card-body participants-panel">
      <Text preset={TEXT_PRESET.heading4}>
        {t.lobby.participants(session.participants.length)}
      </Text>
      <ParticipantBadges
        participants={session.participants}
        facilitatorId={session.facilitatorId}
        myId={session.myId}
      />
      <Text preset={TEXT_PRESET.caption} className="participants-panel__settings">
        {session.facilitatorVotes ? t.settings.youVote : t.settings.youDontVote}
        {' · '}
        {t.settings.anonymity}: {t.settings.levels[session.anonymity]}
      </Text>
    </Card>
  );
}

export default ParticipantsPanel;
```

In `src/components/facilitator/FacilitatorView.tsx`, delete `setFacilitatorVotes: (value: boolean) => void;` from `FacilitatorActions` and replace the panel line with:

```tsx
      <ParticipantsPanel session={session} />
```

In `src/pages/SessionPage.tsx`, delete the `setFacilitatorVotes: …` line from `facilitatorActions`.

In `src/pages/CreateSession.tsx`, make the call compile until Task 3 replaces it:

```ts
import { DEFAULT_SESSION_SETTINGS, createSession, describeError } from '../lib/sessionStore';
…
      const code = await createSession(categories, DEFAULT_SESSION_SETTINGS);
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds with no type errors; all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add database.rules.json src/lib/sessionStore.ts src/lib/i18n.ts src/pages/SessionPage.tsx src/pages/CreateSession.tsx src/components/facilitator/FacilitatorView.tsx src/components/facilitator/ParticipantsPanel.tsx
git commit -m "feat: fix session settings at creation and open ballots to allowed readers"
```

---

### Task 3: Settings on the creation form

**Files:**
- Modify: `src/pages/CreateSession.tsx`
- Modify: `src/styles/main.css` (append)

**Interfaces:**
- Consumes: `ANONYMITY_LEVELS`, `Anonymity`, `SessionSettings` (Task 1); `DEFAULT_SESSION_SETTINGS`, `createSession(categories, settings)`, `t.settings` (Task 2).

- [ ] **Step 1: Add the settings card**

In `src/pages/CreateSession.tsx`, replace the ODS import with:

```ts
import {
  Button,
  Card,
  FormField,
  FormFieldLabel,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  ICON_NAME,
  Radio,
  RadioControl,
  RadioGroup,
  RadioLabel,
  Text,
  TEXT_PRESET,
  Toggle,
  ToggleControl,
  ToggleLabel,
} from '@ovhcloud/ods-react';
import { ANONYMITY_LEVELS, Anonymity, Category, SessionSettings } from '../types';
```

(drop the old `import { Category } from '../types';`).

After the `categories` state add:

```ts
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
```

Change the call to:

```ts
      const code = await createSession(categories, settings);
```

Between `<CategoryEditor … />` and the error `Message`, add:

```tsx
      <Card className="card-body stack create-session__settings">
        <Text preset={TEXT_PRESET.heading4}>{t.settings.title}</Text>
        <Toggle
          checked={settings.facilitatorVotes}
          onCheckedChange={({ checked }) => setSettings((s) => ({ ...s, facilitatorVotes: checked }))}
        >
          <ToggleControl />
          <ToggleLabel>{t.settings.facilitatorVotes}</ToggleLabel>
        </Toggle>
        <FormField>
          <FormFieldLabel>{t.settings.anonymity}</FormFieldLabel>
          <RadioGroup
            className="create-session__levels"
            value={settings.anonymity}
            onValueChange={({ value }) => setSettings((s) => ({ ...s, anonymity: value as Anonymity }))}
          >
            {ANONYMITY_LEVELS.map((level) => (
              <Radio key={level} className="create-session__level" value={level}>
                <div className="create-session__level-body">
                  <RadioControl />
                  <RadioLabel>{t.settings.levels[level]}</RadioLabel>
                  <Text preset={TEXT_PRESET.caption} className="create-session__level-hint">
                    {t.settings.levelHints[level]}
                  </Text>
                </div>
              </Radio>
            ))}
          </RadioGroup>
        </FormField>
      </Card>
```

- [ ] **Step 2: Lay out the radio options**

Append to `src/styles/main.css`:

```css
/* ─── Session settings (creation form) ─── */

/* ODS sizes Radio to max-content, which keeps the hints on one line */
.create-session__level {
  width: 100%;
}

.create-session__level-body {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--ods-theme-column-gap);
  align-items: center;
}

.create-session__level-hint {
  grid-column: 2;
}
```

- [ ] **Step 3: Build and check in the browser**

Run: `npm run build`
Expected: success.

Run `npm run dev`, open `/#/create`: the settings card shows the toggle on and "Off" selected with the three hints readable at phone width (375 px) without horizontal scroll. Switch the language: labels follow. Create a session with "Facilitator only" and the toggle off → lobby panel reads "You don't take part in the vote · Vote anonymization: Facilitator only".

- [ ] **Step 4: Commit**

```bash
git add src/pages/CreateSession.tsx src/styles/main.css
git commit -m "feat: choose vote settings when creating a session"
```

---

### Task 4: Show who voted what

**Files:**
- Create: `src/components/NamedVotes.tsx`
- Modify: `src/components/ResultsGrid.tsx`
- Modify: `src/components/facilitator/FacilitatorView.tsx:114-119`
- Modify: `src/components/PresenterView.tsx:279-284`
- Modify: `src/components/SessionFinished.tsx`
- Modify: `src/components/facilitator/FinishedNotes.tsx`
- Modify: `src/lib/i18n.ts` (`results` in `en` and `fr`)
- Modify: `src/styles/main.css` (append)

**Interfaces:**
- Consumes: `NamedVote`, `ClientSessionState.namedVotes`, `sharedNamedVotes` (Task 1).
- Produces: `NamedVotes({ votes }: { votes: NamedVote[] })`; `ResultsGrid` gains `namedVotes?: NamedVote[]`; `t.results.byPerson`, `t.results.unknownVoter`.

- [ ] **Step 1: Strings**

In `en.results` add:

```ts
    byPerson: 'Who voted what',
    unknownVoter: 'Former participant',
```

In `fr.results` add:

```ts
    byPerson: 'Qui a voté quoi',
    unknownVoter: 'Ancien participant',
```

- [ ] **Step 2: The list component**

Create `src/components/NamedVotes.tsx`:

```tsx
import { Badge, Icon, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { NamedVote } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';

/** Each voter with their colour and trend, under a vote matrix. */
function NamedVotes({ votes }: { votes: NamedVote[] }) {
  if (!votes.length) return null;
  return (
    <div className="stack named-votes">
      <Text preset={TEXT_PRESET.heading5}>{t.results.byPerson}</Text>
      <ul className="named-votes__list">
        {votes.map(({ id, name, vote }) => {
          const color = COLOR_OPTIONS.find((o) => o.value === vote.color)!;
          const trend = TREND_OPTIONS.find((o) => o.value === vote.trend)!;
          return (
            <li key={id} className="named-votes__item">
              <Text preset={TEXT_PRESET.span} className="named-votes__name">
                {name ?? t.results.unknownVoter}
              </Text>
              <Badge color={color.badge}>{color.label}</Badge>
              <span className="named-votes__trend" title={trend.label}>
                <Icon name={trend.icon} aria-hidden="true" />
                <span className="visually-hidden">{trend.label}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default NamedVotes;
```

Append to `src/styles/main.css`:

```css
/* ─── Named votes ─── */

.named-votes__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: var(--ods-theme-row-gap) calc(var(--ods-theme-column-gap) * 2);
}

.named-votes__item {
  display: flex;
  align-items: center;
  gap: var(--ods-theme-column-gap);
}

.named-votes__name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 3: Render it under the results**

`src/components/ResultsGrid.tsx`:

```tsx
import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { NamedVote, Vote } from '../types';
import NamedVotes from './NamedVotes';
import VoteMatrix from './VoteMatrix';
import { t } from '../lib/i18n';

interface Props {
  votes: Vote[];
  /** Who voted what, when this audience may see it */
  namedVotes?: NamedVote[];
  inline?: boolean;
}

/** Results in their own card, or `inline` as a section of an enclosing card. */
function ResultsGrid({ votes, namedVotes, inline = false }: Props) {
  const content = (
    <>
      <Text preset={inline ? TEXT_PRESET.heading5 : TEXT_PRESET.heading3} className="results-grid__title">
        {t.results.title(votes.length)}
      </Text>
      <div className="table-scroll results-grid__matrix">
        <VoteMatrix votes={votes} />
      </div>
      {namedVotes && <NamedVotes votes={namedVotes} />}
    </>
  );
  return inline ? (
    <div className="stack results-grid results-grid--inline">{content}</div>
  ) : (
    <Card className="card-body results-grid">{content}</Card>
  );
}

export default ResultsGrid;
```

`src/components/facilitator/FacilitatorView.tsx` — the revealed round (not the live one) gets names:

```tsx
          <ResultsGrid votes={session.currentResults} namedVotes={session.namedVotes[current]} inline />
```

`src/components/PresenterView.tsx` — import `sharedNamedVotes` from `'../lib/deriveClientState'` and use:

```tsx
          <ResultsGrid
            votes={session.currentResults}
            namedVotes={sharedNamedVotes(session, currentCategoryIndex)}
          />
```

`src/components/SessionFinished.tsx` (rendered only by the presenter window) — import `NamedVotes` from `'./NamedVotes'` and `sharedNamedVotes` from `'../lib/deriveClientState'`; after `<VoteMatrix votes={result.votes} compact />` add:

```tsx
              {sharedNamedVotes(session, result.categoryIndex) && (
                <NamedVotes votes={sharedNamedVotes(session, result.categoryIndex)!} />
              )}
```

`src/components/facilitator/FinishedNotes.tsx` — import `NamedVotes` from `'../NamedVotes'`; after the `VoteSummary` / loading ternary add:

```tsx
            {session.namedVotes[i] && <NamedVotes votes={session.namedVotes[i]} />}
```

- [ ] **Step 4: Build, test and check in the browser**

Run: `npm run build && npm test`
Expected: success, all tests PASS.

Publish `database.rules.json` to the Firebase project first (README step 5). Then with two browsers (A facilitator, B participant):
- **Off** session: after reveal, the presenter window and A's view list "Alice / Bob" with badge and trend; nothing during voting.
- **Facilitator only** session: after reveal, A's view lists names; the presenter window shows the matrix only; at the end, A's notes page lists names, the presenter recap does not.
- **Full** session: no names anywhere.

- [ ] **Step 5: Commit**

```bash
git add src/components/NamedVotes.tsx src/components/ResultsGrid.tsx src/components/PresenterView.tsx src/components/SessionFinished.tsx src/components/facilitator/FacilitatorView.tsx src/components/facilitator/FinishedNotes.tsx src/lib/i18n.ts src/styles/main.css
git commit -m "feat: show who voted what where the anonymization allows it"
```

---

### Task 5: Names in the exported report

**Files:**
- Modify: `src/lib/exportReport.ts`
- Modify: `src/lib/i18n.ts` (`report` in `en` and `fr`)
- Test: `src/lib/exportReport.test.ts`

**Interfaces:**
- Consumes: `ClientSessionState.namedVotes` (Task 1), `t.results.unknownVoter` (Task 4).
- Produces: `t.report.byPerson`, `t.report.person`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/exportReport.test.ts`, give `finished()` a second parameter and use it:

```ts
function finished(allResults: CategoryResult[], namedVotes: ClientSessionState['namedVotes'] = {}): ClientSessionState {
```

and replace `namedVotes: {},` with `namedVotes,`.

Add inside `describe('generateMarkdown', …)`:

```ts
  it('lists who voted what when names are available', () => {
    const md = generateMarkdown(
      finished([{ categoryIndex: 0, votes: [{ color: 'green', trend: 'up' }], notes: '' }, empty(1)], {
        0: [
          { id: 'fac', name: 'Alice', vote: { color: 'green', trend: 'up' } },
          { id: 'gone', name: null, vote: { color: 'red', trend: 'down' } },
        ],
      }),
    );
    const fun = md.slice(md.indexOf('### 1. Fun'), md.indexOf('### 2. Ownership'));
    expect(fun).toContain('**Votes by person:**');
    expect(fun).toContain('- Alice: 🟢 ↗');
    expect(fun).toContain('- Former participant: 🔴 ↘');
  });

  it('lists no names in anonymous sessions', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).not.toContain('Votes by person');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/exportReport.test.ts`
Expected: FAIL — "Votes by person" not found.

- [ ] **Step 3: Implement**

Strings — `en.report` add:

```ts
    byPerson: 'Votes by person',
    person: 'Person',
```

`fr.report` add:

```ts
    byPerson: 'Votes par personne',
    person: 'Personne',
```

In `generateMarkdown`, after the `md += \`**${r.trend}:** …\`` line add:

```ts
    const named = session.namedVotes[result.categoryIndex];
    if (named?.length) {
      md += `**${r.byPerson}:**\n\n`;
      for (const { name, vote } of named) {
        md += `- ${name ?? m.results.unknownVoter}: ${COLOR_EMOJI[vote.color]} ${TREND_ARROW[vote.trend]}\n`;
      }
      md += `\n`;
    }
```

In `downloadPDF`, between the summary `autoTable(…)` and `/* Notes */`, add:

```ts
  /* Votes by person, when the session was not fully anonymous */
  const namedRows = session.allResults.flatMap((r) =>
    (session.namedVotes[r.categoryIndex] ?? []).map(({ name, vote }) => [
      localizeCategory(session.categories[r.categoryIndex]).title,
      name ?? t.results.unknownVoter,
      t.colors[vote.color],
      t.trends[vote.trend],
    ]),
  );
  if (namedRows.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [[t.report.category, t.report.person, t.report.health, t.report.trend]],
      body: namedRows,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 217], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test && npm run build`
Expected: PASS, build succeeds.

Manually: in a finished "Off" session, download the PDF → a "Category / Person / Health / Trend" table follows the summary.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportReport.ts src/lib/exportReport.test.ts src/lib/i18n.ts
git commit -m "feat: list who voted what in the exported report"
```

---

### Task 6: Wording and README

**Files:**
- Modify: `src/lib/i18n.ts` (`home`, `intro`, `facilitator.introScript` in `en` and `fr`)
- Modify: `src/components/IntroContent.tsx`
- Modify: `src/components/PresenterView.tsx:257`
- Modify: `src/components/ParticipantView.tsx:354,375`
- Modify: `src/components/facilitator/FacilitatorView.tsx:148-152`
- Modify: `README.md`

**Interfaces:**
- Consumes: `Anonymity`, `ClientSessionState.anonymity` (Task 1).
- Produces: `t.intro.anonymity: Record<Anonymity, string>`, `t.facilitator.introScriptEnd: string`; `IntroContent` gains a required `anonymity: Anonymity` prop.

- [ ] **Step 1: Strings**

`en.home.intro`:

```ts
      "Run health check sessions with your team. Vote on categories, discuss results, and track your squad's well-being.",
```

`en.home.steps[3]`:

```ts
      'Votes can be anonymous, visible to the facilitator only, or named — the facilitator chooses',
```

`en.intro` add:

```ts
    anonymity: {
      off: 'Votes are named: everyone sees who voted what once each round is revealed.',
      facilitator: 'Votes are anonymous to the team; only the facilitator sees who voted what.',
      full: 'Votes are anonymous: results only show totals.',
    },
```

`en.facilitator.introScript`: delete the last element ("Votes are anonymous. After each one, …"), and add after the array:

```ts
    introScriptEnd: "After each vote, we'll discuss the results, especially where we disagree. Let's start!",
```

`fr.home.intro`:

```ts
      "Animez des bilans de santé avec votre équipe. Votez sur des catégories, discutez des résultats et suivez le bien-être de votre squad.",
```

`fr.home.steps[3]`:

```ts
      'Les votes peuvent être anonymes, visibles du facilitateur seulement, ou nominatifs — le facilitateur choisit',
```

`fr.intro` add:

```ts
    anonymity: {
      off: 'Les votes sont nominatifs : tout le monde voit qui a voté quoi une fois chaque manche révélée.',
      facilitator: "Les votes sont anonymes pour l'équipe ; seul le facilitateur voit qui a voté quoi.",
      full: 'Les votes sont anonymes : les résultats ne montrent que des totaux.',
    },
```

`fr.facilitator.introScript`: delete the last element ("Les votes sont anonymes. Après chacun, …"), and add:

```ts
    introScriptEnd: "Après chaque vote, nous discuterons des résultats, surtout là où nous ne sommes pas d'accord. C'est parti !",
```

- [ ] **Step 2: Show the level in the intro, the script and the vote form**

`src/components/IntroContent.tsx`: import `Anonymity` with `Category` from `'../types'`; add to `Props`:

```ts
  /** Told before the first vote, so everyone knows who will see it */
  anonymity: Anonymity;
```

destructure it (`function IntroContent({ categories, anonymity, compact = false }: Props)`), and after the category-count `<Text>` add:

```tsx
      <Text preset={TEXT_PRESET.paragraph} className="intro-content__anonymity">
        {t.intro.anonymity[anonymity]}
      </Text>
```

`src/components/PresenterView.tsx`: `<IntroContent categories={categories} anonymity={session.anonymity} />`.

`src/components/ParticipantView.tsx`: `<IntroContent categories={categories} anonymity={session.anonymity} compact />`; and right before `{isPicking && (` add:

```tsx
      {isPicking && session.anonymity !== 'full' && (
        <Text preset={TEXT_PRESET.caption} className="participant-view__anonymity">
          {t.intro.anonymity[session.anonymity]}
        </Text>
      )}
```

`src/components/facilitator/FacilitatorView.tsx`, intro script card — replace the `.map` over `t.facilitator.introScript` with:

```tsx
          {[
            ...t.facilitator.introScript,
            `${t.intro.anonymity[session.anonymity]} ${t.facilitator.introScriptEnd}`,
          ].map((paragraph) => (
            <Text key={paragraph} preset={TEXT_PRESET.paragraph}>
              {paragraph}
            </Text>
          ))}
```

- [ ] **Step 3: README**

In `README.md` "Features":
- Replace "…and may opt out of voting in the lobby" with "…and chooses at creation whether they take part in the vote".
- Add after the "Private facilitator notes" bullet:

```markdown
- **Vote anonymization** — Chosen at creation: *off* (everyone sees who voted what once a round is revealed), *facilitator only* (only the facilitator sees names; the shared screen shows totals) or *full* (totals only). Names are never visible while a round is being voted (enforced by database rules)
```

In "Manual test checklist":
- Step 1 becomes: "A: create a session (settings left as is), enter a name → facilitator view with the share link, participants (A with 👑) and "You take part in the vote · Vote anonymization: Off"."
- Step 11 becomes: "New session created with "I take part in the vote" off: "X / N" excludes A, A has no vote form, auto-reveal fires once B has voted. Rules Playground: *write* `true` at `/sessions/<CODE>/voters/<index>/<A's UID>` as A → *Denied*; *write* `true` at `/sessions/<CODE>/state/facilitatorVotes` as A → *Denied*."
- Add after step 11:

```markdown
12. Anonymization, one session per level, Rules Playground *read* `/sessions/<CODE>/ballots/<current index>`:
    - during voting → *Denied* for A and B at every level;
    - after reveal, **Off** → *Allowed* for A and B; presenter and A's view list names;
    - after reveal, **Facilitator only** → *Allowed* for A, *Denied* for B; only A's view lists names, not the presenter;
    - after reveal, **Full** → *Denied* for A and B; no names anywhere;
    - *write* `"full"` at `/sessions/<CODE>/state/anonymity` as A → *Denied*.
```

and renumber the following steps (12 → 13, 13 → 14).

- [ ] **Step 4: Build, test and check in the browser**

Run: `npm run build && npm test`
Expected: success, all tests PASS.

In each level, the presenter intro, the participant's compact intro and A's intro script state the right level in both languages; in "Off" and "Facilitator only" B's vote form shows the one-line notice and still fits a phone screen without scrolling.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/components/IntroContent.tsx src/components/PresenterView.tsx src/components/ParticipantView.tsx src/components/facilitator/FacilitatorView.tsx README.md
git commit -m "feat: tell the team who will see their votes"
```

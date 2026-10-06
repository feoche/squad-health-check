# Presenter, Voting and Facilitator Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the session into a screen-shared presenter window, a phone-first voting view for participants, and a creator-only facilitator view (compact or dashboard) — with a new introduction step and an opt-out for the facilitator's own vote.

**Architecture:** The data layer gains an `intro` phase and a `state/facilitatorVotes` flag; `deriveClientState` (pure, tested) derives the eligible voters and who has voted. `/session/:code` renders `ParticipantView` or `FacilitatorView` depending on `session.isFacilitator`; a new `/session/:code/present` route renders `PresenterView` in a popup opened from the facilitator view. Old views (`Lobby`, `VotingView`, `FacilitatorNotesPage`) stay working until Task 6 replaces them, so the app works after every task.

**Tech Stack:** React 18, TypeScript, Vite 5, `@ovhcloud/ods-react` 19.7, Firebase JS SDK 12 (Realtime Database), Vitest 3 (node environment, `src/**/*.test.ts` only).

**Spec:** `docs/specs/2026-10-05-voting-views-design.md`

## Global Constraints

- **Before Task 1:** the working tree must be clean. `src/App.tsx` and `src/components/VotingView.tsx` carry uncommitted edits by the user — ask the user to commit or stash them; do not commit them yourself. This plan's code assumes those edits are in (navbar title is an `h1`; the code badge renders `<span>{t.code(session.code)}</span>`).
- Phases: `'lobby' | 'intro' | 'voting' | 'revealed' | 'finished'`.
- `state/facilitatorVotes`: boolean, **absent means `true`**; changeable in the lobby only.
- The workshop can start only with **≥ 1 eligible voter** (`totalVoters > 0`).
- Presenter view: **no buttons, no notes**, in every phase. Only the session creator (`meta/facilitatorId === uid`) may open it.
- Facilitator view: only the session creator; notes editable for the **current** category during the session, for **every** category once finished.
- Layout choice stored in `localStorage` key `shc-facilitator-layout` (`'compact' | 'full'`); default Full at window width ≥ **768px**, Compact below; every storage access wrapped in try/catch.
- Presenter popup: `window.open(url, 'shc-present-<code>', 'popup,width=1280,height=800')`; title `Presenter — <CODE>` / `Présentation — <CODE>`.
- Every user-facing string goes in `src/lib/i18n.ts`, in **both** `en` and `fr` (`fr` is typed `Messages`, so `npm run build` fails on a missing key).
- UI uses ODS components and ODS design tokens only (see the header of `src/styles/main.css`).
- Router is `HashRouter`; app URLs are `${origin}${pathname}#/…`.
- Commits: plain conventional messages, **no** `Co-Authored-By` or tool attribution lines.
- Rules change in `database.rules.json` must be published in the Firebase console **before** the app is pushed to `main` (README, Firebase setup step 5).

## Review Focus

1. **The facilitator turns "I take part in the vote" off and is alone in the lobby** — "Start workshop" must be disabled with a hint, otherwise every round shows "0 / 0" and never auto-reveals. Test `canStartWorkshop` in Task 1; disabled button in Task 6.
2. **A session created before this change (no `facilitatorVotes` in `state`)** — the facilitator still counts as a voter and auto-reveal still waits for them. Test in Task 1.
3. **Site data blocked / storage throwing** — the facilitator view still renders with the width-based layout and the toggle still works for the page. Test in Task 6 (`layoutMode.test.ts`).
4. **A participant opens a forwarded `/#/session/CODE/present` link** — sees "Only the facilitator can open the presenter view", never the presenter content. Manual check in Task 4.
5. **The next category starts while the vote form still holds the previous picks** — the form must reset per category (`key={currentCategoryIndex}`). Manual check in Task 5 and Task 6.

---

### Task 1: Eligible voters and the intro phase in derived state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/deriveClientState.ts`
- Modify: `src/lib/deriveClientState.test.ts`
- Modify: `src/components/VotingView.tsx` (one prop)
- Modify: `src/pages/FacilitatorNotesPage.tsx` (one call, one map entry)
- Modify: `src/lib/i18n.ts` (`notes.phases.intro` in `en` and `fr`)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `SessionPhase` includes `'intro'`.
  - `SessionStateNode.facilitatorVotes?: boolean`.
  - `ClientSessionState.facilitatorVotes: boolean`, `eligibleVoters: Participant[]`, `voterIds: string[]`, `totalVoters: number` (replaces `totalParticipants`); `voteCount` = `voterIds.length`.
  - `canStartWorkshop(session: Pick<ClientSessionState, 'isFacilitator' | 'phase' | 'totalVoters'>): boolean` exported from `src/lib/deriveClientState.ts`.
  - `summaryIndexes` returns `[]` for `'intro'`; `shouldAutoReveal` compares against `totalVoters`.

- [ ] **Step 1: Rename the field in the existing tests**

Run: `sed -i 's/totalParticipants/totalVoters/g' src/lib/deriveClientState.test.ts`

- [ ] **Step 2: Add the failing tests**

In `src/lib/deriveClientState.test.ts`, add `canStartWorkshop` to the import from `./deriveClientState`:

```ts
import {
  RawSession,
  canStartWorkshop,
  deriveClientState,
  readableVoteIndexes,
  shouldAutoReveal,
  summaryIndexes,
} from './deriveClientState';
```

Append inside the top-level `describe('deriveClientState', …)` block, after the `facilitatorNotesLoaded` describe:

```ts
  describe('eligible voters', () => {
    const voting = { phase: 'voting' as const, currentCategoryIndex: 0 };

    it('counts the facilitator when facilitatorVotes is absent or true', () => {
      for (const state of [voting, { ...voting, facilitatorVotes: true }]) {
        const s = deriveClientState('ABC234', raw({ state }), 'fac')!;
        expect(s.facilitatorVotes).toBe(true);
        expect(s.totalVoters).toBe(2);
        expect(s.eligibleVoters.map((p) => p.id)).toEqual(['fac', 'bob']);
      }
    });

    it('leaves the facilitator out when facilitatorVotes is false', () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...voting, facilitatorVotes: false } }),
        'bob',
      )!;
      expect(s.facilitatorVotes).toBe(false);
      expect(s.totalVoters).toBe(1);
      expect(s.eligibleVoters.map((p) => p.id)).toEqual(['bob']);
      expect(s.participants).toHaveLength(2);
    });

    it("ignores the facilitator's voter flag when they do not vote", () => {
      const s = deriveClientState(
        'ABC234',
        raw({ state: { ...voting, facilitatorVotes: false }, voters: { '0': { fac: true } } }),
        'fac',
      )!;
      expect(s.voteCount).toBe(0);
      expect(s.voterIds).toEqual([]);
    });

    it('lists who voted this round in participant order', () => {
      const s = deriveClientState(
        'ABC234',
        raw({
          state: voting,
          participants: { fac: { name: 'Alice' }, bob: { name: 'Bob' }, cat: { name: 'Cat' } },
          voters: { '0': { cat: true, fac: true } },
        }),
        'fac',
      )!;
      expect(s.voterIds).toEqual(['fac', 'cat']);
      expect(s.voteCount).toBe(2);
    });
  });
```

In `describe('summaryIndexes', …)`, add:

```ts
  it('lists nothing during the introduction', () => {
    expect(summaryIndexes({ phase: 'intro', currentCategoryIndex: 0, categories })).toEqual([]);
  });
```

In `describe('shouldAutoReveal', …)`, add:

```ts
  it('fires when every eligible voter voted and the facilitator does not vote', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'voting', currentCategoryIndex: 0, facilitatorVotes: false },
        voters: { '0': { bob: true } },
      }),
      'fac',
    )!;
    expect(shouldAutoReveal(s)).toBe(true);
  });
```

Append a new top-level describe at the end of the file:

```ts
describe('canStartWorkshop', () => {
  it('lets the facilitator start from the lobby with at least one voter', () => {
    expect(canStartWorkshop(deriveClientState('ABC234', raw(), 'fac')!)).toBe(true);
  });

  it('refuses when the facilitator is alone and does not vote', () => {
    const s = deriveClientState(
      'ABC234',
      raw({
        state: { phase: 'lobby', currentCategoryIndex: 0, facilitatorVotes: false },
        participants: { fac: { name: 'Alice' } },
      }),
      'fac',
    )!;
    expect(s.totalVoters).toBe(0);
    expect(canStartWorkshop(s)).toBe(false);
  });

  it('refuses for participants and outside the lobby', () => {
    expect(canStartWorkshop(deriveClientState('ABC234', raw(), 'bob')!)).toBe(false);
    const intro = deriveClientState(
      'ABC234',
      raw({ state: { phase: 'intro', currentCategoryIndex: 0 } }),
      'fac',
    )!;
    expect(canStartWorkshop(intro)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/deriveClientState.test.ts`
Expected: FAIL — `canStartWorkshop` is not exported, and `totalVoters` / `eligibleVoters` / `voterIds` / `facilitatorVotes` are undefined.

- [ ] **Step 4: Update the types**

In `src/types.ts`, replace:

```ts
export type SessionPhase = 'lobby' | 'voting' | 'revealed' | 'finished';
```

with:

```ts
export type SessionPhase = 'lobby' | 'intro' | 'voting' | 'revealed' | 'finished';
```

In `ClientSessionState`, replace:

```ts
  voteCount: number;
  totalParticipants: number;
```

with:

```ts
  /** Eligible voters who voted in the current round */
  voteCount: number;
  /** Number of eligible voters (participants, minus the facilitator when they don't vote) */
  totalVoters: number;
  /** Whether the facilitator takes part in the vote (absent in the database means true) */
  facilitatorVotes: boolean;
  eligibleVoters: Participant[];
  /** Ids of the eligible voters who voted in the current round, in participant order */
  voterIds: string[];
```

- [ ] **Step 5: Implement in `deriveClientState.ts`**

Replace the `SessionStateNode` interface with:

```ts
export interface SessionStateNode {
  phase: SessionPhase;
  currentCategoryIndex: number;
  /** Absent in sessions created before the setting existed: counts as true */
  facilitatorVotes?: boolean;
}
```

In `deriveClientState`, replace:

```ts
  const roundVoters = at(raw.voters, currentCategoryIndex) ?? {};

  const isFacilitator = facilitatorId === myId;
```

with:

```ts
  const roundVoters = at(raw.voters, currentCategoryIndex) ?? {};

  const isFacilitator = facilitatorId === myId;

  const facilitatorVotes = raw.state.facilitatorVotes !== false;
  const eligibleVoters = facilitatorVotes
    ? participants
    : participants.filter((p) => p.id !== facilitatorId);
  const voterIds = eligibleVoters.filter((p) => roundVoters[p.id]).map((p) => p.id);
```

In the returned object, replace:

```ts
    voteCount: Object.keys(roundVoters).length,
    totalParticipants: participants.length,
```

with:

```ts
    voteCount: voterIds.length,
    totalVoters: eligibleVoters.length,
    facilitatorVotes,
    eligibleVoters,
    voterIds,
```

In `summaryIndexes`, replace:

```ts
      : session.phase === 'lobby'
        ? 0
```

with:

```ts
      : session.phase === 'lobby' || session.phase === 'intro'
        ? 0
```

Replace `shouldAutoReveal` with:

```ts
/** The facilitator's tab reveals the round once every eligible voter has voted. */
export function shouldAutoReveal(session: ClientSessionState): boolean {
  return (
    session.isFacilitator &&
    session.phase === 'voting' &&
    session.totalVoters > 0 &&
    session.voteCount >= session.totalVoters
  );
}

/** With no eligible voter, no round could ever be revealed automatically. */
export function canStartWorkshop(
  session: Pick<ClientSessionState, 'isFacilitator' | 'phase' | 'totalVoters'>,
): boolean {
  return session.isFacilitator && session.phase === 'lobby' && session.totalVoters > 0;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/deriveClientState.test.ts`
Expected: PASS.

- [ ] **Step 7: Keep the app compiling**

In `src/components/VotingView.tsx`, replace `totalParticipants={session.totalParticipants}` with `totalParticipants={session.totalVoters}`.

In `src/pages/FacilitatorNotesPage.tsx`, replace `t.votesReceived(session.voteCount, session.totalParticipants)` with `t.votesReceived(session.voteCount, session.totalVoters)`, and add `intro: BADGE_COLOR.information,` to `PHASE_BADGE` after `lobby`.

In `src/lib/i18n.ts`, `en.notes.phases` becomes:

```ts
    phases: { lobby: 'Lobby', intro: 'Introduction', voting: 'Voting', revealed: 'Revealed', finished: 'Finished' },
```

and `fr.notes.phases`:

```ts
    phases: { lobby: "Salle d'attente", intro: 'Introduction', voting: 'Vote en cours', revealed: 'Révélé', finished: 'Terminé' },
```

- [ ] **Step 8: Build and run every test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/lib/deriveClientState.ts src/lib/deriveClientState.test.ts src/components/VotingView.tsx src/pages/FacilitatorNotesPage.tsx src/lib/i18n.ts
git commit -m "feat: derive eligible voters and add the intro phase"
```

---

### Task 2: Rules and store for the intro phase and the facilitator-votes setting

**Files:**
- Modify: `database.rules.json`
- Modify: `src/lib/sessionStore.ts`

**Interfaces:**
- Consumes: `SessionPhase` with `'intro'` (Task 1).
- Produces (in `src/lib/sessionStore.ts`):
  - `startWorkshop(s: ClientSessionState): Promise<void>` — facilitator, lobby → intro.
  - `setFacilitatorVotes(s: ClientSessionState, value: boolean): Promise<void>` — facilitator, lobby only.
  - `createSession` writes `facilitatorVotes: true`.
  - `startVoting` is **unchanged in this task** (still lobby → voting); Task 6 switches it to intro → voting together with the UI that calls it.

- [ ] **Step 1: Update the rules**

In `database.rules.json`, inside `state`, replace:

```json
          "phase": { ".validate": "newData.val() === 'lobby' || newData.val() === 'voting' || newData.val() === 'revealed' || newData.val() === 'finished'" },
          "currentCategoryIndex": { ".validate": "newData.isNumber() && newData.val() >= 0" },
```

with:

```json
          "phase": { ".validate": "newData.val() === 'lobby' || newData.val() === 'intro' || newData.val() === 'voting' || newData.val() === 'revealed' || newData.val() === 'finished'" },
          "currentCategoryIndex": { ".validate": "newData.isNumber() && newData.val() >= 0" },
          "facilitatorVotes": { ".validate": "newData.isBoolean()" },
```

Inside `voters/$idx/$uid`, replace the `.write` value with (one line, the only change is the trailing `&& !(…)` clause):

```json
              ".write": "auth != null && $uid === auth.uid && !data.exists() && root.child('sessions/' + $code + '/participants/' + auth.uid).exists() && root.child('sessions/' + $code + '/state/phase').val() === 'voting' && root.child('sessions/' + $code + '/state/currentCategoryIndex').val() + '' === $idx && !(root.child('sessions/' + $code + '/meta/facilitatorId').val() === auth.uid && root.child('sessions/' + $code + '/state/facilitatorVotes').val() === false)",
```

Run: `node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8'))" && echo ok`
Expected: `ok`.

- [ ] **Step 2: Update the store**

In `src/lib/sessionStore.ts`, in `createSession`, replace:

```ts
        state: { phase: 'lobby', currentCategoryIndex: 0 },
```

with:

```ts
        state: { phase: 'lobby', currentCategoryIndex: 0, facilitatorVotes: true },
```

Above `startVoting`, add:

```ts
export async function startWorkshop(s: ClientSessionState): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'lobby') return;
  await writeState(s, { phase: 'intro' });
}

/** Locked once the workshop starts, so the vote count of a round never changes under it. */
export async function setFacilitatorVotes(s: ClientSessionState, value: boolean): Promise<void> {
  if (!s.isFacilitator || s.phase !== 'lobby') return;
  await writeState(s, { facilitatorVotes: value });
}
```

- [ ] **Step 3: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 4: Publish and check the rules (manual)**

Paste `database.rules.json` in Firebase console → Realtime Database → Rules → **Publish**. Then in the **Rules Playground** for an existing lobby session `<CODE>` (Authenticated, UID = the creator's):
- *update* `/sessions/<CODE>/state` with `{"facilitatorVotes": false}` → **Allowed**; same with another UID → **Denied**.
- *update* `/sessions/<CODE>/state` with `{"phase": "intro"}` → **Allowed**.
- With `facilitatorVotes` false and `phase` `voting` in the data: *set* `/sessions/<CODE>/voters/0/<creator UID>` to `true` as the creator → **Denied**; as a joined participant's UID → **Allowed**.

If the playground is not available to the implementer, record this step as "to run by the user" in the task report.

- [ ] **Step 5: Commit**

```bash
git add database.rules.json src/lib/sessionStore.ts
git commit -m "feat: store the intro phase and the facilitator-votes setting"
```

---

### Task 3: Extract shared building blocks from the old views

No behaviour change: `Lobby`, `VotingView` and `VotingPanel` render the same screens, built from components the new views reuse.

**Files:**
- Create: `src/components/ColorCards.tsx`
- Create: `src/components/VoteProgress.tsx`
- Create: `src/components/SessionProgress.tsx`
- Create: `src/components/SharePanel.tsx`
- Create: `src/components/ParticipantBadges.tsx`
- Modify: `src/components/ResultsGrid.tsx`
- Modify: `src/components/VotingView.tsx`
- Modify: `src/components/VotingPanel.tsx`
- Modify: `src/components/Lobby.tsx`
- Modify: `src/styles/main.css`

**Interfaces:**
- Consumes: `ClientSessionState.totalVoters` (Task 1).
- Produces (default exports):
  - `ColorCards({ category?: Category })` — three colour cards; generic meanings (`t.colorFallbacks`) when `category` is omitted.
  - `VoteProgress({ voteCount: number; totalVoters: number })` — "X / N votes received" + bar.
  - `SessionProgress({ session: ClientSessionState; children?: ReactNode })` — renders into the navbar: category X/N + bar during voting/revealed, the code badge, then `children`.
  - `SharePanel({ code: string })` — code, QR, copyable link (fragment, to sit inside a `card-body`).
  - `ParticipantBadges({ participants: Participant[]; facilitatorId: string; myId?: string })`.
  - `ResultsGrid({ votes: Vote[] })` — results card without buttons.

- [ ] **Step 1: Create `src/components/ColorCards.tsx`**

```tsx
import { Badge, Card, CARD_COLOR, type CardColor, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Category, VoteColor } from '../types';
import { COLOR_OPTIONS, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

const CARD_COLORS: Record<VoteColor, CardColor> = {
  green: CARD_COLOR.success,
  orange: CARD_COLOR.warning,
  red: CARD_COLOR.critical,
};

/** The three health colours, described for a category or, without one, in general terms. */
function ColorCards({ category }: { category?: Category }) {
  return (
    <div className="grid-3">
      {COLOR_OPTIONS.map((option) => (
        <Card key={option.value} className="card-body card-compact" color={CARD_COLORS[option.value]}>
          <Badge className="self-start" color={option.badge}>{option.label}</Badge>
          <Text preset={TEXT_PRESET.paragraph}>
            {category ? colorDescription(category, option) : t.colorFallbacks[option.value]}
          </Text>
        </Card>
      ))}
    </div>
  );
}

export default ColorCards;
```

- [ ] **Step 2: Create `src/components/VoteProgress.tsx`**

```tsx
import { ProgressBar, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

function VoteProgress({ voteCount, totalVoters }: { voteCount: number; totalVoters: number }) {
  return (
    <div className="stack stack-center">
      <Text preset={TEXT_PRESET.paragraph}>{t.votesReceived(voteCount, totalVoters)}</Text>
      <ProgressBar
        className="vote-progress"
        value={voteCount}
        max={totalVoters}
        aria-label={t.voting.votesReceivedLabel}
      />
    </div>
  );
}

export default VoteProgress;
```

- [ ] **Step 3: Create `src/components/SessionProgress.tsx`**

```tsx
import { type ReactNode } from 'react';
import { Badge, BADGE_COLOR, ProgressBar, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import HeaderSlot from './HeaderSlot';
import { t } from '../lib/i18n';

interface Props {
  session: ClientSessionState;
  children?: ReactNode;
}

/** Navbar content: category progress during a round, the session code, then any extra items. */
function SessionProgress({ session, children }: Props) {
  const { currentCategoryIndex: index, categories, phase } = session;
  const inRound = phase === 'voting' || phase === 'revealed';

  return (
    <HeaderSlot>
      <div className="header-progress">
        {inRound && (
          <>
            <Text preset={TEXT_PRESET.label} className="header-progress-label">
              <span className="hide-mobile">{t.categoryOf(index + 1, categories.length)}</span>
              <span className="show-mobile">
                {index + 1}/{categories.length}
              </span>
            </Text>
            <ProgressBar
              className="header-progress-bar"
              value={index + 1}
              max={categories.length}
              aria-label={t.voting.sessionProgress}
            />
          </>
        )}
        <Badge color={BADGE_COLOR.neutral}>
          <span>{t.code(session.code)}</span>
        </Badge>
        {children}
      </div>
    </HeaderSlot>
  );
}

export default SessionProgress;
```

- [ ] **Step 4: Create `src/components/SharePanel.tsx`**

```tsx
import {
  Clipboard,
  ClipboardControl,
  ClipboardTrigger,
  FormField,
  FormFieldLabel,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../lib/i18n';

// Always share the published app, even from a local dev server, so the link
// and QR code work for participants on other devices.
const PUBLIC_APP_URL = 'https://feoche.github.io/squad-health-check/';

/** Session code, QR code and copyable link — everything needed to join. */
function SharePanel({ code }: { code: string }) {
  const shareUrl = `${PUBLIC_APP_URL}#/session/${code}`;

  return (
    <>
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.label}>{t.lobby.sessionCode}</Text>
        <Text preset={TEXT_PRESET.heading1} as="p" className="session-code">
          {code}
        </Text>
      </div>

      <div className="stack stack-center">
        <QRCodeSVG
          value={shareUrl}
          size={192}
          marginSize={2}
          className="session-qr"
          title={t.lobby.qrTitle}
        />
        <Text preset={TEXT_PRESET.caption}>{t.lobby.scanToJoin}</Text>
      </div>

      <FormField>
        <FormFieldLabel>{t.lobby.shareLink}</FormFieldLabel>
        <Clipboard value={shareUrl}>
          <ClipboardControl />
          <ClipboardTrigger labelCopy={t.lobby.copyLink} labelCopySuccess={t.lobby.linkCopied} />
        </Clipboard>
      </FormField>
    </>
  );
}

export default SharePanel;
```

- [ ] **Step 5: Create `src/components/ParticipantBadges.tsx`**

```tsx
import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { Participant } from '../types';
import { t } from '../lib/i18n';

interface Props {
  participants: Participant[];
  facilitatorId: string;
  /** Highlights the current user; omit on screens nobody "is" (the presenter) */
  myId?: string;
}

function ParticipantBadges({ participants, facilitatorId, myId }: Props) {
  return (
    <div className="inline wrap">
      {participants.map((p) => (
        <Badge key={p.id} color={p.id === myId ? BADGE_COLOR.primary : BADGE_COLOR.neutral}>
          {p.id === facilitatorId && <Icon name={ICON_NAME.crown} />}
          {p.name}
          {p.id === myId && t.lobby.you}
        </Badge>
      ))}
    </div>
  );
}

export default ParticipantBadges;
```

- [ ] **Step 6: Strip the buttons from `src/components/ResultsGrid.tsx`**

Replace the whole file with:

```tsx
import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { Vote } from '../types';
import VoteMatrix from './VoteMatrix';
import { t } from '../lib/i18n';

function ResultsGrid({ votes }: { votes: Vote[] }) {
  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading3}>{t.results.title(votes.length)}</Text>
      <div className="table-scroll">
        <VoteMatrix votes={votes} />
      </div>
    </Card>
  );
}

export default ResultsGrid;
```

- [ ] **Step 7: Rebuild `src/components/VotingView.tsx` from the blocks**

Replace the whole file with:

```tsx
import { Button, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import VotingPanel from './VotingPanel';
import ResultsGrid from './ResultsGrid';
import ColorCards from './ColorCards';
import SessionProgress from './SessionProgress';
import OpenNotesButton from './OpenNotesButton';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  onRevealVotes: () => void;
  onNextCategory: () => void;
  onEndSession: () => void;
}

function VotingView({
  session,
  onSubmitVote,
  onRevealVotes,
  onNextCategory,
  onEndSession,
}: Props) {
  const category = session.categories[session.currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);
  const isPicking = session.phase === 'voting' && !session.hasVoted;
  const isLastCategory = session.currentCategoryIndex === session.categories.length - 1;

  return (
    <div className="page">
      <SessionProgress session={session}>
        {session.isFacilitator && <OpenNotesButton className="desktop-only" code={session.code} />}
      </SessionProgress>

      {/* Category */}
      <div className="category-header">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        {subtitle && <Text>{subtitle}</Text>}
        {/* While picking, the descriptions live in the vote tiles instead */}
        {!isPicking && <ColorCards category={category} />}
      </div>

      {/* Voting or Results */}
      {session.phase === 'voting' && (
        <VotingPanel
          category={category}
          hasVoted={session.hasVoted}
          voteCount={session.voteCount}
          totalParticipants={session.totalVoters}
          onSubmitVote={onSubmitVote}
          isFacilitator={session.isFacilitator}
          onRevealVotes={onRevealVotes}
        />
      )}

      {session.phase === 'revealed' && session.currentResults && (
        <>
          <ResultsGrid votes={session.currentResults} />
          {session.isFacilitator && (
            <div className="actions">
              {!isLastCategory ? (
                <Button onClick={onNextCategory}>
                  {t.results.next}
                  <Icon name={ICON_NAME.arrowRight} />
                </Button>
              ) : (
                <Button onClick={onEndSession}>
                  {t.results.finish}
                  <Icon name={ICON_NAME.check} />
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VotingView;
```

- [ ] **Step 8: Use `VoteProgress` in `src/components/VotingPanel.tsx`**

Replace the `const progress = ( … );` block with:

```tsx
  const progress = <VoteProgress voteCount={voteCount} totalVoters={totalParticipants} />;
```

Add `import VoteProgress from './VoteProgress';` and remove `ProgressBar` from the ODS import.

- [ ] **Step 9: Rebuild `src/components/Lobby.tsx` from the blocks**

Replace the whole file with:

```tsx
import { Button, Card, Spinner, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import OpenNotesButton from './OpenNotesButton';
import SharePanel from './SharePanel';
import ParticipantBadges from './ParticipantBadges';
import { t } from '../lib/i18n';

interface Props {
  session: ClientSessionState;
  onStartVoting: () => void;
}

function Lobby({ session, onStartVoting }: Props) {
  const count = session.participants.length;

  return (
    <div className="page page-narrow">
      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading2}>{t.lobby.title}</Text>

        <SharePanel code={session.code} />

        <div className="stack">
          <Text preset={TEXT_PRESET.heading4}>{t.lobby.participants(count)}</Text>
          <ParticipantBadges
            participants={session.participants}
            facilitatorId={session.facilitatorId}
            myId={session.myId}
          />
        </div>

        <Text preset={TEXT_PRESET.paragraph}>
          {t.lobby.categoriesToReview(session.categories.length)}
        </Text>

        {session.isFacilitator ? (
          <div className="actions">
            <Button onClick={onStartVoting} disabled={count < 1}>
              {t.lobby.startVoting(count)}
            </Button>
            <OpenNotesButton className="desktop-only" code={session.code} />
          </div>
        ) : (
          <div className="stack stack-center">
            <Spinner />
            <Text preset={TEXT_PRESET.paragraph}>{t.lobby.waiting}</Text>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Lobby;
```

- [ ] **Step 10: Right-align the navbar items when there is no progress bar**

In `src/styles/main.css`, in the `.header-progress` rule, add `justify-content: flex-end;`.

- [ ] **Step 11: Build, test, look**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

Run `npm run dev`, open `http://localhost:3000`, create a session, join, start voting, vote, reveal: lobby, voting and results screens look exactly as before (navbar progress, code badge, colour cards, "X / N votes received", Next Category button).

- [ ] **Step 12: Commit**

```bash
git add src/components src/styles/main.css
git commit -m "refactor: extract shared session building blocks"
```

---

### Task 4: Presenter window

**Files:**
- Create: `src/components/IntroContent.tsx`
- Create: `src/components/PresenterView.tsx`
- Create: `src/components/OpenPresenterButton.tsx`
- Create: `src/pages/PresenterPage.tsx`
- Modify: `src/App.tsx` (route)
- Modify: `src/components/SessionFinished.tsx` (drop the notes hint)
- Modify: `src/components/Lobby.tsx`, `src/components/VotingView.tsx` (temporary presenter button)
- Modify: `src/lib/i18n.ts`
- Modify: `src/styles/main.css`

**Interfaces:**
- Consumes: `ColorCards`, `VoteProgress`, `SessionProgress`, `SharePanel`, `ParticipantBadges`, `ResultsGrid` (Task 3); `ClientSessionState.totalVoters` (Task 1).
- Produces:
  - `IntroContent({ categories: Category[]; compact?: boolean })` — compact drops the title, the explanation and the category list.
  - `PresenterView({ session: ClientSessionState })`.
  - `OpenPresenterButton({ code: string; className?: string })`.
  - Route `/session/:code/present` → `PresenterPage`.
  - i18n: `t.presenter.{open, allowPopups, documentTitle(code), onlyFacilitator, joinTitle}`, `t.intro.{title, what, colorsTitle, trendsTitle, trendsHint, anonymous}`.

- [ ] **Step 1: Add the strings**

In `src/lib/i18n.ts`, in `en`, after the `finished` block, add:

```ts
  presenter: {
    open: 'Presenter window',
    allowPopups: 'Allow pop-ups for this site to open the presenter window.',
    documentTitle: (code: string) => `Presenter — ${code}`,
    onlyFacilitator: 'Only the facilitator can open the presenter view',
    joinTitle: 'Join the health check',
  },

  intro: {
    title: 'Welcome to our squad health check',
    what: 'A quick look at how the squad is doing. For each category, everyone picks a health colour and a trend, then we discuss the results together.',
    colorsTitle: 'Health colours',
    trendsTitle: 'Trend',
    trendsHint: 'Compared with how things were recently.',
    anonymous: 'Votes are anonymous: only totals are shown, never who voted what.',
  },
```

In `fr`, at the same place:

```ts
  presenter: {
    open: 'Fenêtre de présentation',
    allowPopups: "Autorisez les pop-ups pour ce site afin d'ouvrir la fenêtre de présentation.",
    documentTitle: (code) => `Présentation — ${code}`,
    onlyFacilitator: 'Seul le facilitateur peut ouvrir la vue de présentation',
    joinTitle: 'Rejoignez le bilan de santé',
  },

  intro: {
    title: 'Bienvenue dans notre bilan de santé de squad',
    what: "Un rapide tour de l'état de la squad. Pour chaque catégorie, chacun choisit une couleur et une tendance, puis nous discutons ensemble des résultats.",
    colorsTitle: 'Couleurs de santé',
    trendsTitle: 'Tendance',
    trendsHint: 'Par rapport à la situation récente.',
    anonymous: 'Les votes sont anonymes : seuls les totaux sont affichés, jamais qui a voté quoi.',
  },
```

In both `en.finished` and `fr.finished`, delete the `notesHint` line.

- [ ] **Step 2: Create `src/components/IntroContent.tsx`**

```tsx
import {
  Badge,
  BADGE_COLOR,
  Icon,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { Category } from '../types';
import ColorCards from './ColorCards';
import { TREND_OPTIONS } from './voteOptions';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  categories: Category[];
  /** Phone legend: colours, trends and anonymity only */
  compact?: boolean;
}

/** Built-in presentation of the workshop, shown before the first category. */
function IntroContent({ categories, compact = false }: Props) {
  return (
    <div className="stack">
      {!compact && (
        <>
          <Text preset={TEXT_PRESET.heading1}>{t.intro.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>{t.intro.what}</Text>
        </>
      )}

      <Text preset={TEXT_PRESET.heading3}>{t.intro.colorsTitle}</Text>
      <ColorCards />

      <Text preset={TEXT_PRESET.heading3}>{t.intro.trendsTitle}</Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.intro.trendsHint}</Text>
      <div className="inline wrap">
        {TREND_OPTIONS.map(({ value, label, icon }) => (
          <Badge key={value} color={BADGE_COLOR.neutral}>
            <Icon name={icon} /> {label}
          </Badge>
        ))}
      </div>

      <Message color={MESSAGE_COLOR.information} dismissible={false}>
        <MessageIcon name={ICON_NAME.circleInfo} />
        <MessageBody>{t.intro.anonymous}</MessageBody>
      </Message>

      {!compact && (
        <>
          <Text preset={TEXT_PRESET.heading3}>
            {t.lobby.categoriesToReview(categories.length)}
          </Text>
          <ol className="steps">
            {categories.map((category, i) => (
              <li key={i}>
                <Text preset={TEXT_PRESET.paragraph}>{localizeCategory(category).title}</Text>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export default IntroContent;
```

- [ ] **Step 3: Create `src/components/PresenterView.tsx`**

```tsx
import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../types';
import ColorCards from './ColorCards';
import IntroContent from './IntroContent';
import ParticipantBadges from './ParticipantBadges';
import ResultsGrid from './ResultsGrid';
import SessionFinished from './SessionFinished';
import SessionProgress from './SessionProgress';
import SharePanel from './SharePanel';
import VoteProgress from './VoteProgress';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

/** The screen-shared view: no buttons and no notes, in any phase. */
function PresenterView({ session }: { session: ClientSessionState }) {
  const { phase, categories, currentCategoryIndex } = session;

  if (phase === 'finished') return <SessionFinished session={session} />;

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow presenter">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading2}>{t.presenter.joinTitle}</Text>
          <SharePanel code={session.code} />
          <div className="stack">
            <Text preset={TEXT_PRESET.heading4}>
              {t.lobby.participants(session.participants.length)}
            </Text>
            <ParticipantBadges
              participants={session.participants}
              facilitatorId={session.facilitatorId}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="page presenter">
        <IntroContent categories={categories} />
      </div>
    );
  }

  const category = categories[currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);

  return (
    <div className="page presenter">
      <SessionProgress session={session} />

      <div className="category-header">
        <Text preset={TEXT_PRESET.heading1}>{title}</Text>
        {subtitle && <Text preset={TEXT_PRESET.paragraph}>{subtitle}</Text>}
        <ColorCards category={category} />
      </div>

      {phase === 'voting' && (
        <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
      )}

      {phase === 'revealed' &&
        (session.currentResults ? (
          <ResultsGrid votes={session.currentResults} />
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}
    </div>
  );
}

export default PresenterView;
```

- [ ] **Step 4: Create `src/components/OpenPresenterButton.tsx`**

```tsx
import { Button, BUTTON_SIZE, BUTTON_VARIANT, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

const presenterUrl = (code: string) =>
  `${window.location.origin}${window.location.pathname}#/session/${code}/present`;

/** Opens the screen-share window (re-focused if already open). */
function OpenPresenterButton({ code, className }: { code: string; className?: string }) {
  const open = () => {
    const win = window.open(
      presenterUrl(code),
      `shc-present-${code}`,
      'popup,width=1280,height=800',
    );
    if (win) win.focus();
    else window.alert(t.presenter.allowPopups);
  };

  return (
    <Button
      className={className}
      size={BUTTON_SIZE.sm}
      variant={BUTTON_VARIANT.ghost}
      onClick={open}
    >
      <Icon name={ICON_NAME.monitor} />
      {t.presenter.open}
      <Icon name={ICON_NAME.externalLink} />
    </Button>
  );
}

export default OpenPresenterButton;
```

- [ ] **Step 5: Create `src/pages/PresenterPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClientSessionState } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { CODE_PATTERN } from '../lib/sessionCode';
import * as store from '../lib/sessionStore';
import { t } from '../lib/i18n';
import { Connecting, SessionNotice } from '../components/SessionStatus';
import PresenterView from '../components/PresenterView';

/** Never joins as a participant, so opening it does not change the head count. */
function PresenterScreen() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [error, setError] = useState('');

  /* Distinct title so this window is easy to pick in the screen-share dialog */
  useEffect(() => {
    const previous = document.title;
    document.title = t.presenter.documentTitle(code);
    return () => {
      document.title = previous;
    };
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    if (!CODE_PATTERN.test(code)) {
      setError(t.sessionNotFound);
      return;
    }
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) setError(t.sessionNotFound);
          return;
        }
        if (!cancelled) setUid(id);
      } catch (err) {
        if (!cancelled) setError(store.describeError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!uid) return;
    return store.subscribeSession(code, uid, setSession);
  }, [uid, code]);

  if (error) return <SessionNotice title={error} backTo="/" backLabel={t.backToHome} />;
  if (!session) return <Connecting />;
  if (!session.isFacilitator) {
    return (
      <SessionNotice
        title={t.presenter.onlyFacilitator}
        backTo={`/session/${code}`}
        backLabel={t.notes.backToSession}
      />
    );
  }
  return <PresenterView session={session} />;
}

/* Remount per code so navigating between sessions resets all state */
function PresenterPage() {
  const { code = '' } = useParams<{ code: string }>();
  return <PresenterScreen key={code} />;
}

export default PresenterPage;
```

- [ ] **Step 6: Add the route**

In `src/App.tsx`, add `import PresenterPage from './pages/PresenterPage';` and, after the `/session/:code/notes` route:

```tsx
            <Route path="/session/:code/present" element={<PresenterPage />} />
```

- [ ] **Step 7: Drop the notes hint from `src/components/SessionFinished.tsx`**

Delete the `{session.isFacilitator && ( … )}` block at the end of the page and the `OpenNotesButton` import. Update the doc comment to:

```tsx
/** Shared recap: votes only — notes and exports live in the facilitator view. */
```

- [ ] **Step 8: Temporary entry points (removed in Task 6)**

In `src/components/Lobby.tsx`, import `OpenPresenterButton` and add `<OpenPresenterButton className="desktop-only" code={session.code} />` after the `OpenNotesButton` in the facilitator actions.

In `src/components/VotingView.tsx`, import `OpenPresenterButton` and render it next to the notes button inside `SessionProgress`:

```tsx
      <SessionProgress session={session}>
        {session.isFacilitator && (
          <>
            <OpenPresenterButton className="desktop-only" code={session.code} />
            <OpenNotesButton className="desktop-only" code={session.code} />
          </>
        )}
      </SessionProgress>
```

- [ ] **Step 9: Let the presenter use the screen width**

In `src/styles/main.css`, after the `.app-main` rule, add:

```css
/* The shared screen and the dashboard use the whole width */
.app-main:has(.presenter) {
  max-width: 1200px;
}
```

- [ ] **Step 10: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 11: Manual check**

`npm run dev`. Browser A: create a session, join, click **Presenter window** → a popup titled "Presenter — <CODE>" shows the code, QR, link and participants, with no buttons. Browser B (private window): join → B appears in the popup. A: start voting → popup shows category, colour cards and "0 / 2 votes received"; B votes → "1 / 2"; reveal → results matrix; finish → recap without the notes hint. B: open `…/#/session/<CODE>/present` → "Only the facilitator can open the presenter view" (Review Focus 4).

- [ ] **Step 12: Commit**

```bash
git add src/components src/pages/PresenterPage.tsx src/App.tsx src/lib/i18n.ts src/styles/main.css
git commit -m "feat: add the presenter window"
```

---

### Task 5: Participant view

**Files:**
- Create: `src/components/ParticipantView.tsx`
- Create: `src/components/VoteSubmitted.tsx`
- Modify: `src/components/VotingPanel.tsx` (pure vote form)
- Modify: `src/components/VotingView.tsx` (progress and reveal move here; facilitator-only from now on)
- Modify: `src/pages/SessionPage.tsx`
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Consumes: `ColorCards`, `SessionProgress`, `ParticipantBadges`, `ResultsGrid`, `VoteProgress` (Task 3); `IntroContent` (Task 4).
- Produces:
  - `VotingPanel({ category: Category; onSubmitVote: (color: VoteColor, trend: VoteTrend) => void })` — form only; render it with `key={currentCategoryIndex}`.
  - `VoteSubmitted()` — "Vote submitted!" + "Waiting for the others…".
  - `ParticipantView({ session: ClientSessionState; onSubmitVote: (color: VoteColor, trend: VoteTrend) => void })`.
  - i18n: `t.participant.{intro, waitingOthers, resultsOnScreen}`.

- [ ] **Step 1: Add the strings**

In `src/lib/i18n.ts`, in `en` after `intro`:

```ts
  participant: {
    intro: 'The workshop is starting — watch the shared screen.',
    waitingOthers: 'Waiting for the others…',
    resultsOnScreen: 'The results are on the shared screen.',
  },
```

In `fr`:

```ts
  participant: {
    intro: "L'atelier commence — regardez l'écran partagé.",
    waitingOthers: 'En attente des autres…',
    resultsOnScreen: "Les résultats sont sur l'écran partagé.",
  },
```

- [ ] **Step 2: Create `src/components/VoteSubmitted.tsx`**

```tsx
import { Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { t } from '../lib/i18n';

function VoteSubmitted() {
  return (
    <div className="stack stack-center">
      <Text preset={TEXT_PRESET.heading3}>
        <Icon name={ICON_NAME.circleCheck} /> {t.voting.submitted}
      </Text>
      <Text preset={TEXT_PRESET.paragraph}>{t.participant.waitingOthers}</Text>
    </div>
  );
}

export default VoteSubmitted;
```

- [ ] **Step 3: Make `src/components/VotingPanel.tsx` a pure form**

Replace the whole file with:

```tsx
import { useState } from 'react';
import {
  Badge,
  Button,
  FormField,
  FormFieldError,
  FormFieldLabel,
  Icon,
  Radio,
  RadioControl,
  RadioGroup,
  RadioLabel,
  Text,
  TEXT_PRESET,
  Tile,
} from '@ovhcloud/ods-react';
import { Category, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS, colorDescription } from './voteOptions';
import { t } from '../lib/i18n';

interface Props {
  category: Category;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
}

/** The vote form. Render it with a key per category so picks never carry over. */
function VotingPanel({ category, onSubmitVote }: Props) {
  const [selectedColor, setSelectedColor] = useState<VoteColor | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<VoteTrend | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (selectedColor && selectedTrend) {
      onSubmitVote(selectedColor, selectedTrend);
    }
  };

  const colorMissing = submitted && !selectedColor;
  const trendMissing = submitted && !selectedTrend;

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <FormField invalid={colorMissing}>
        <FormFieldLabel className="vote-field-label">{t.voting.healthColor}</FormFieldLabel>
        <RadioGroup
          className="tile-options"
          orientation="horizontal"
          value={selectedColor ?? undefined}
          onValueChange={({ value }) => setSelectedColor(value as VoteColor)}
        >
          {COLOR_OPTIONS.map((option) => (
            <Tile key={option.value} selected={selectedColor === option.value}>
              <Radio className="tile-radio-root" value={option.value}>
                <div className="tile-radio">
                  <RadioControl />
                  <RadioLabel>
                    <Badge color={option.badge}>{option.label}</Badge>
                  </RadioLabel>
                  <Text className="tile-radio-description" preset={TEXT_PRESET.paragraph}>
                    {colorDescription(category, option)}
                  </Text>
                </div>
              </Radio>
            </Tile>
          ))}
        </RadioGroup>
        <FormFieldError>{t.voting.pickColor}</FormFieldError>
      </FormField>

      <FormField invalid={trendMissing}>
        <FormFieldLabel className="vote-field-label">{t.voting.trend}</FormFieldLabel>
        <RadioGroup
          className="tile-options tile-options-trend"
          orientation="horizontal"
          value={selectedTrend ?? undefined}
          onValueChange={({ value }) => setSelectedTrend(value as VoteTrend)}
        >
          {TREND_OPTIONS.map(({ value, label, icon }) => (
            <Tile key={value} selected={selectedTrend === value}>
              <Radio className="tile-radio-root" value={value}>
                <div className="tile-radio">
                  <RadioControl />
                  <RadioLabel>
                    <Icon name={icon} /> <span>{label}</span>
                  </RadioLabel>
                </div>
              </Radio>
            </Tile>
          ))}
        </RadioGroup>
        <FormFieldError>{t.voting.pickTrend}</FormFieldError>
      </FormField>

      <div className="actions vote-submit">
        <Button type="submit">{t.voting.submit}</Button>
      </div>
    </form>
  );
}

export default VotingPanel;
```

- [ ] **Step 4: Move progress and reveal into `src/components/VotingView.tsx`**

`VotingView` now only renders for the facilitator. Replace the `{session.phase === 'voting' && ( <VotingPanel … /> )}` block with:

```tsx
      {session.phase === 'voting' && (
        <>
          {session.hasVoted ? (
            <VoteSubmitted />
          ) : (
            <VotingPanel
              key={session.currentCategoryIndex}
              category={category}
              onSubmitVote={onSubmitVote}
            />
          )}
          <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
          {session.voteCount > 0 && session.voteCount < session.totalVoters && (
            <div className="actions">
              <Button variant={BUTTON_VARIANT.outline} onClick={onRevealVotes}>
                {t.voting.revealNowCount(session.voteCount, session.totalVoters)}
              </Button>
            </div>
          )}
        </>
      )}
```

Add `BUTTON_VARIANT` to the ODS import, and `import VoteSubmitted from './VoteSubmitted';`, `import VoteProgress from './VoteProgress';`.

- [ ] **Step 5: Create `src/components/ParticipantView.tsx`**

```tsx
import {
  Card,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Spinner,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import ColorCards from './ColorCards';
import IntroContent from './IntroContent';
import ParticipantBadges from './ParticipantBadges';
import ResultsGrid from './ResultsGrid';
import SessionFinished from './SessionFinished';
import SessionProgress from './SessionProgress';
import VoteSubmitted from './VoteSubmitted';
import VotingPanel from './VotingPanel';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
}

/** A participant's phone: the vote form must fit one screen, so no counter here. */
function ParticipantView({ session, onSubmitVote }: Props) {
  const { phase, categories, currentCategoryIndex } = session;

  if (phase === 'finished') return <SessionFinished session={session} />;

  if (phase === 'lobby') {
    return (
      <div className="page page-narrow">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>
            {t.lobby.participants(session.participants.length)}
          </Text>
          <ParticipantBadges
            participants={session.participants}
            facilitatorId={session.facilitatorId}
            myId={session.myId}
          />
          <div className="stack stack-center">
            <Spinner />
            <Text preset={TEXT_PRESET.paragraph}>{t.lobby.waiting}</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="page">
        <Message color={MESSAGE_COLOR.information} dismissible={false}>
          <MessageIcon name={ICON_NAME.circleInfo} />
          <MessageBody>{t.participant.intro}</MessageBody>
        </Message>
        <IntroContent categories={categories} compact />
      </div>
    );
  }

  const category = categories[currentCategoryIndex];
  const { title, subtitle } = localizeCategory(category);
  const isPicking = phase === 'voting' && !session.hasVoted;

  return (
    <div className="page">
      <SessionProgress session={session} />

      <div className="category-header">
        <Text preset={TEXT_PRESET.heading2}>{title}</Text>
        {subtitle && <Text>{subtitle}</Text>}
        {/* While picking, the descriptions live in the vote tiles instead */}
        {!isPicking && <ColorCards category={category} />}
      </div>

      {isPicking && (
        <VotingPanel key={currentCategoryIndex} category={category} onSubmitVote={onSubmitVote} />
      )}

      {phase === 'voting' && session.hasVoted && <VoteSubmitted />}

      {phase === 'revealed' && (
        <>
          <Text preset={TEXT_PRESET.paragraph} className="stack-center">
            {t.participant.resultsOnScreen}
          </Text>
          {session.currentResults ? (
            <ResultsGrid votes={session.currentResults} />
          ) : (
            <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
          )}
        </>
      )}
    </div>
  );
}

export default ParticipantView;
```

- [ ] **Step 6: Route participants to it in `src/pages/SessionPage.tsx`**

Add `import ParticipantView from '../components/ParticipantView';`. Replace the `/* ─── Session views ─── */` block up to (not including) the final `return (` with:

```tsx
  /* ─── Session views ─── */
  let view: JSX.Element;
  if (!session.isFacilitator) {
    view = <ParticipantView session={session} onSubmitVote={handleSubmitVote} />;
  } else {
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
            onEndSession={handleEndSession}
          />
        );
        break;
      case 'finished':
        view = <SessionFinished session={session} />;
        break;
      default:
        view = <Text preset={TEXT_PRESET.paragraph}>{t.unknownState}</Text>;
    }
  }
```

- [ ] **Step 7: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 8: Manual check**

`npm run dev`. A creates and joins; B joins in a private window with DevTools device mode at **375×667** (iPhone SE).
- B lobby: participants + "Waiting for the facilitator…", no share block.
- A starts voting. B: category title, colour tiles, trends, Submit — **no** "votes received" text or bar, no vertical scroll at 375×667. B votes → "Vote submitted! / Waiting for the others…".
- A votes → auto-reveal; B sees "The results are on the shared screen." and the matrix.
- A: Next Category → B's form is **empty** (no colour or trend pre-selected — Review Focus 5).
- A's own window still shows the vote counter and reveal button.

- [ ] **Step 9: Commit**

```bash
git add src/components src/pages/SessionPage.tsx src/lib/i18n.ts
git commit -m "feat: give participants their own voting view without the counter"
```

---

### Task 6: Facilitator view (compact and dashboard)

**Files:**
- Create: `src/lib/layoutMode.ts`
- Create: `src/lib/layoutMode.test.ts`
- Create: `src/components/facilitator/useLayoutMode.ts`
- Create: `src/components/facilitator/FacilitatorView.tsx`
- Create: `src/components/facilitator/FacilitatorControls.tsx`
- Create: `src/components/facilitator/LiveRound.tsx`
- Create: `src/components/facilitator/ParticipantsPanel.tsx`
- Create: `src/components/facilitator/FinishedNotes.tsx`
- Modify: `src/components/NoteFields.tsx` (export `EMPTY_NOTE`)
- Modify: `src/lib/sessionStore.ts` (`startVoting` guard)
- Modify: `src/pages/SessionPage.tsx`
- Modify: `src/App.tsx` (`/notes` redirect)
- Modify: `src/lib/i18n.ts`
- Modify: `src/styles/main.css`
- Delete: `src/components/Lobby.tsx`, `src/components/VotingView.tsx`, `src/components/OpenNotesButton.tsx`, `src/pages/FacilitatorNotesPage.tsx`

**Interfaces:**
- Consumes: `canStartWorkshop` and `summaryIndexes` from `src/lib/deriveClientState.ts` (Task 1); `store.startWorkshop`, `store.setFacilitatorVotes` (Task 2); `SessionProgress`, `SharePanel`, `ParticipantBadges`, `ResultsGrid`, `VoteProgress` (Task 3); `OpenPresenterButton` (Task 4); `VotingPanel`, `VoteSubmitted` (Task 5).
- Produces:
  - `src/lib/layoutMode.ts`: `type LayoutMode = 'compact' | 'full'`, `LAYOUT_KEY`, `FULL_LAYOUT_MIN_WIDTH`, `initialLayout(stored: string | null, width: number): LayoutMode`, `readStoredLayout(storage: () => Pick<Storage, 'getItem'>): string | null`, `storeLayout(storage: () => Pick<Storage, 'setItem'>, mode: LayoutMode): void`.
  - `useLayoutMode(): [LayoutMode, (mode: LayoutMode) => void]`.
  - `FacilitatorActions` interface and `FacilitatorView({ session, actions })` in `src/components/facilitator/FacilitatorView.tsx`.
  - `EMPTY_NOTE: FacilitatorNote` exported from `src/components/NoteFields.tsx`.
  - i18n: `t.facilitator.{layout, compact, full, startWorkshop(n), needVoter, introHint, startFirst, facilitatorVotes, facilitatorVotesHint, myVote, voted, waiting, allNotes, loadingNotes}`.

- [ ] **Step 1: Write the failing layout tests**

Create `src/lib/layoutMode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FULL_LAYOUT_MIN_WIDTH,
  LAYOUT_KEY,
  initialLayout,
  readStoredLayout,
  storeLayout,
} from './layoutMode';

function memoryStorage() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

const blocked = (): never => {
  throw new Error('SecurityError: storage is disabled');
};

describe('initialLayout', () => {
  it('uses a stored choice whatever the width', () => {
    expect(initialLayout('compact', 1600)).toBe('compact');
    expect(initialLayout('full', 320)).toBe('full');
  });

  it('defaults to full on wide windows and compact on narrow ones', () => {
    expect(initialLayout(null, FULL_LAYOUT_MIN_WIDTH)).toBe('full');
    expect(initialLayout(null, FULL_LAYOUT_MIN_WIDTH - 1)).toBe('compact');
  });

  it('ignores unknown stored values', () => {
    expect(initialLayout('grid', 1200)).toBe('full');
  });
});

describe('stored layout', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    storeLayout(() => storage, 'compact');
    expect(storage.data[LAYOUT_KEY]).toBe('compact');
    expect(readStoredLayout(() => storage)).toBe('compact');
  });

  it('reads nothing and does not throw when storage is blocked', () => {
    expect(readStoredLayout(blocked)).toBeNull();
    expect(() => storeLayout(blocked, 'full')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/layoutMode.test.ts`
Expected: FAIL — cannot resolve `./layoutMode`.

- [ ] **Step 3: Implement `src/lib/layoutMode.ts`**

```ts
export type LayoutMode = 'compact' | 'full';

export const LAYOUT_KEY = 'shc-facilitator-layout';

/** Narrower windows (a side window next to the shared screen, a phone) default to compact */
export const FULL_LAYOUT_MIN_WIDTH = 768;

export function initialLayout(stored: string | null, width: number): LayoutMode {
  if (stored === 'compact' || stored === 'full') return stored;
  return width >= FULL_LAYOUT_MIN_WIDTH ? 'full' : 'compact';
}

/** Storage can be unavailable (blocked site data, previews): even accessing it may throw. */
export function readStoredLayout(storage: () => Pick<Storage, 'getItem'>): string | null {
  try {
    return storage().getItem(LAYOUT_KEY);
  } catch {
    return null;
  }
}

export function storeLayout(storage: () => Pick<Storage, 'setItem'>, mode: LayoutMode): void {
  try {
    storage().setItem(LAYOUT_KEY, mode);
  } catch {
    /* The choice then lasts for this page only */
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/layoutMode.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `src/components/facilitator/useLayoutMode.ts`**

```ts
import { useCallback, useState } from 'react';
import { LayoutMode, initialLayout, readStoredLayout, storeLayout } from '../../lib/layoutMode';

const storage = () => window.localStorage;

export function useLayoutMode(): [LayoutMode, (mode: LayoutMode) => void] {
  const [mode, setMode] = useState<LayoutMode>(() =>
    initialLayout(readStoredLayout(storage), window.innerWidth),
  );
  const change = useCallback((next: LayoutMode) => {
    setMode(next);
    storeLayout(storage, next);
  }, []);
  return [mode, change];
}
```

- [ ] **Step 6: Add the strings and drop the dead ones**

In `src/lib/i18n.ts`, in `en` after `participant`:

```ts
  facilitator: {
    layout: 'Layout',
    compact: 'Compact',
    full: 'Full',
    startWorkshop: (n: number) => `Start workshop (${plural(n, 'voter')})`,
    needVoter: 'At least one person must vote before the workshop can start.',
    introHint: 'The introduction is on the shared screen. Start the first category when the team is ready.',
    startFirst: 'Start first category',
    facilitatorVotes: 'I take part in the vote',
    facilitatorVotesHint: 'Can only be changed before the workshop starts.',
    myVote: 'My vote',
    voted: 'voted',
    waiting: 'waiting',
    allNotes: 'Notes per category',
    loadingNotes: 'Loading notes…',
  },
```

In `fr`:

```ts
  facilitator: {
    layout: 'Affichage',
    compact: 'Compact',
    full: 'Complet',
    startWorkshop: (n) => `Lancer l'atelier (${n} votant${n !== 1 ? 's' : ''})`,
    needVoter: "Au moins une personne doit voter pour lancer l'atelier.",
    introHint: "L'introduction est sur l'écran partagé. Lancez la première catégorie quand l'équipe est prête.",
    startFirst: 'Lancer la première catégorie',
    facilitatorVotes: 'Je participe au vote',
    facilitatorVotesHint: "Modifiable uniquement avant le début de l'atelier.",
    myVote: 'Mon vote',
    voted: 'a voté',
    waiting: 'en attente',
    allNotes: 'Notes par catégorie',
    loadingNotes: 'Chargement des notes…',
  },
```

In both `en` and `fr`, delete these keys (their only users are deleted in this task): `lobby.title`, `lobby.startVoting`, `voting.revealNow`, `notes.button`, `notes.allowPopups`, `notes.documentTitle`, `notes.onlyFacilitator`, `notes.phases`, `notes.summary`, `notes.notStarted`, `notes.appearLater`. Keep `notes.backToSession`, `notes.privacy`, `notes.downloadMarkdown`, `notes.downloadPdf`, `notes.discussion`, `notes.placeholder`.

- [ ] **Step 7: Export `EMPTY_NOTE` from `src/components/NoteFields.tsx`**

After the imports, add:

```tsx
export const EMPTY_NOTE: FacilitatorNote = { notes: '' };
```

- [ ] **Step 8: Create `src/components/facilitator/FacilitatorControls.tsx`**

```tsx
import {
  Button,
  BUTTON_VARIANT,
  Card,
  Icon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { canStartWorkshop } from '../../lib/deriveClientState';
import { t } from '../../lib/i18n';
import OpenPresenterButton from '../OpenPresenterButton';
import type { FacilitatorActions } from './FacilitatorView';

interface Props {
  session: ClientSessionState;
  actions: FacilitatorActions;
}

/** The one action that moves the session forward in each phase. */
function FacilitatorControls({ session, actions }: Props) {
  const { phase, voteCount, totalVoters } = session;
  const isLastCategory = session.currentCategoryIndex === session.categories.length - 1;
  const canStart = canStartWorkshop(session);

  return (
    <Card className="card-body">
      {phase === 'lobby' && (
        <>
          <Button onClick={actions.startWorkshop} disabled={!canStart}>
            {t.facilitator.startWorkshop(totalVoters)}
          </Button>
          {!canStart && <Text preset={TEXT_PRESET.caption}>{t.facilitator.needVoter}</Text>}
        </>
      )}

      {phase === 'intro' && (
        <>
          <Text preset={TEXT_PRESET.paragraph}>{t.facilitator.introHint}</Text>
          <Button onClick={actions.startVoting}>
            {t.facilitator.startFirst}
            <Icon name={ICON_NAME.arrowRight} />
          </Button>
        </>
      )}

      {phase === 'voting' && (
        <Button
          variant={BUTTON_VARIANT.outline}
          onClick={actions.reveal}
          disabled={voteCount === 0}
        >
          {t.voting.revealNowCount(voteCount, totalVoters)}
        </Button>
      )}

      {phase === 'revealed' &&
        (isLastCategory ? (
          <Button onClick={actions.end}>
            {t.results.finish}
            <Icon name={ICON_NAME.check} />
          </Button>
        ) : (
          <Button onClick={actions.next}>
            {t.results.next}
            <Icon name={ICON_NAME.arrowRight} />
          </Button>
        ))}

      <OpenPresenterButton code={session.code} />
    </Card>
  );
}

export default FacilitatorControls;
```

- [ ] **Step 9: Create `src/components/facilitator/LiveRound.tsx`**

```tsx
import { Badge, BADGE_COLOR, Card, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';
import { localizeCategory } from '../../lib/localizeCategory';
import VoteProgress from '../VoteProgress';

/** Who has voted in the current round — names only, never how they voted. */
function LiveRound({ session }: { session: ClientSessionState }) {
  const { categories, currentCategoryIndex: index } = session;
  const voted = new Set(session.voterIds);

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.label}>{t.categoryOf(index + 1, categories.length)}</Text>
      <Text preset={TEXT_PRESET.heading3}>{localizeCategory(categories[index]).title}</Text>
      <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
      <div className="inline wrap">
        {session.eligibleVoters.map((p) => {
          const hasVoted = voted.has(p.id);
          return (
            <Badge key={p.id} color={hasVoted ? BADGE_COLOR.success : BADGE_COLOR.neutral}>
              {hasVoted && <Icon name={ICON_NAME.check} />}
              {p.name}
              <span className="visually-hidden">
                {' — '}
                {hasVoted ? t.facilitator.voted : t.facilitator.waiting}
              </span>
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}

export default LiveRound;
```

- [ ] **Step 10: Create `src/components/facilitator/ParticipantsPanel.tsx`**

```tsx
import { Card, Text, TEXT_PRESET, Toggle, ToggleControl, ToggleLabel } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';
import ParticipantBadges from '../ParticipantBadges';

interface Props {
  session: ClientSessionState;
  onSetFacilitatorVotes: (value: boolean) => void;
}

function ParticipantsPanel({ session, onSetFacilitatorVotes }: Props) {
  const locked = session.phase !== 'lobby';

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading4}>
        {t.lobby.participants(session.participants.length)}
      </Text>
      <ParticipantBadges
        participants={session.participants}
        facilitatorId={session.facilitatorId}
        myId={session.myId}
      />
      <Toggle
        checked={session.facilitatorVotes}
        disabled={locked}
        onCheckedChange={({ checked }) => onSetFacilitatorVotes(checked)}
      >
        <ToggleControl />
        <ToggleLabel>{t.facilitator.facilitatorVotes}</ToggleLabel>
      </Toggle>
      {locked && <Text preset={TEXT_PRESET.caption}>{t.facilitator.facilitatorVotesHint}</Text>}
    </Card>
  );
}

export default ParticipantsPanel;
```

- [ ] **Step 11: Create `src/components/facilitator/FinishedNotes.tsx`**

```tsx
import { Button, BUTTON_VARIANT, Card, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { summaryIndexes } from '../../lib/deriveClientState';
import { downloadMarkdown, downloadPDF } from '../../lib/exportReport';
import { t } from '../../lib/i18n';
import { localizeCategory } from '../../lib/localizeCategory';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import VoteSummary from '../VoteSummary';

const warn = (err: unknown) => console.warn('[export]', err);

interface Props {
  session: ClientSessionState;
  onChangeNote: (categoryIndex: number, value: string) => void;
}

/** Every category's note stays editable once finished, before exporting the report. */
function FinishedNotes({ session, onChangeNote }: Props) {
  return (
    <>
      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading3}>{t.facilitator.allNotes}</Text>
        {summaryIndexes(session).map((i) => (
          <div key={i} className="stack summary-item">
            <Text preset={TEXT_PRESET.heading5}>
              {i + 1}. {localizeCategory(session.categories[i]).title}
            </Text>
            {session.categoryResults[i] ? (
              <VoteSummary votes={session.categoryResults[i]} />
            ) : (
              <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
            )}
            <NoteFields
              note={session.facilitatorNotes[i] ?? EMPTY_NOTE}
              onChange={(_field, value) => onChangeNote(i, value)}
            />
          </div>
        ))}
      </Card>

      <div className="actions">
        <Button onClick={() => downloadMarkdown(session)}>
          <Icon name={ICON_NAME.download} />
          {t.notes.downloadMarkdown}
        </Button>
        <Button variant={BUTTON_VARIANT.outline} onClick={() => downloadPDF(session).catch(warn)}>
          <Icon name={ICON_NAME.download} />
          {t.notes.downloadPdf}
        </Button>
      </div>
    </>
  );
}

export default FinishedNotes;
```

- [ ] **Step 12: Create `src/components/facilitator/FacilitatorView.tsx`**

```tsx
import {
  Card,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Switch,
  SWITCH_SIZE,
  SwitchItem,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../../types';
import { LayoutMode } from '../../lib/layoutMode';
import { t } from '../../lib/i18n';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import ResultsGrid from '../ResultsGrid';
import SessionProgress from '../SessionProgress';
import SharePanel from '../SharePanel';
import VoteSubmitted from '../VoteSubmitted';
import VotingPanel from '../VotingPanel';
import FacilitatorControls from './FacilitatorControls';
import FinishedNotes from './FinishedNotes';
import LiveRound from './LiveRound';
import ParticipantsPanel from './ParticipantsPanel';
import { useLayoutMode } from './useLayoutMode';

export interface FacilitatorActions {
  startWorkshop: () => void;
  startVoting: () => void;
  submitVote: (color: VoteColor, trend: VoteTrend) => void;
  reveal: () => void;
  next: () => void;
  end: () => void;
  setFacilitatorVotes: (value: boolean) => void;
  changeNote: (categoryIndex: number, value: string) => void;
}

interface Props {
  session: ClientSessionState;
  actions: FacilitatorActions;
}

/** The session creator's window: drives the session, keeps private notes, never shared. */
function FacilitatorView({ session, actions }: Props) {
  const [layout, setLayout] = useLayoutMode();
  const { phase, currentCategoryIndex: current } = session;
  const inRound = phase === 'voting' || phase === 'revealed';
  const loadingNotes = <Text preset={TEXT_PRESET.caption}>{t.facilitator.loadingNotes}</Text>;

  const main = (
    <>
      {phase === 'lobby' && (
        <>
          <Message color={MESSAGE_COLOR.information} dismissible={false}>
            <MessageIcon name={ICON_NAME.circleInfo} />
            <MessageBody>{t.notes.privacy}</MessageBody>
          </Message>
          <Card className="card-body">
            <SharePanel code={session.code} />
          </Card>
        </>
      )}

      {inRound && <LiveRound session={session} />}

      {phase === 'voting' && session.facilitatorVotes && (
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>{t.facilitator.myVote}</Text>
          {session.hasVoted ? (
            <VoteSubmitted />
          ) : (
            <VotingPanel
              key={current}
              category={session.categories[current]}
              onSubmitVote={actions.submitVote}
            />
          )}
        </Card>
      )}

      {phase === 'revealed' &&
        (session.currentResults ? (
          <ResultsGrid votes={session.currentResults} />
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}

      {inRound && (
        <Card className="card-body">
          {session.facilitatorNotesLoaded ? (
            <NoteFields
              key={current}
              note={session.facilitatorNotes[current] ?? EMPTY_NOTE}
              onChange={(_field, value) => actions.changeNote(current, value)}
            />
          ) : (
            loadingNotes
          )}
        </Card>
      )}

      {phase === 'finished' &&
        (session.facilitatorNotesLoaded ? (
          <FinishedNotes session={session} onChangeNote={actions.changeNote} />
        ) : (
          loadingNotes
        ))}
    </>
  );

  const side = (
    <>
      <FacilitatorControls session={session} actions={actions} />
      {(layout === 'full' || phase === 'lobby') && (
        <ParticipantsPanel session={session} onSetFacilitatorVotes={actions.setFacilitatorVotes} />
      )}
    </>
  );

  return (
    <div className="page">
      <SessionProgress session={session}>
        <Switch
          size={SWITCH_SIZE.sm}
          value={layout}
          onValueChange={({ value }) => setLayout(value as LayoutMode)}
          aria-label={t.facilitator.layout}
        >
          <SwitchItem value="compact">{t.facilitator.compact}</SwitchItem>
          <SwitchItem value="full">{t.facilitator.full}</SwitchItem>
        </Switch>
      </SessionProgress>

      {layout === 'full' ? (
        <div className="dashboard">
          <div className="stack">{main}</div>
          <div className="stack">{side}</div>
        </div>
      ) : (
        <>
          {side}
          {main}
        </>
      )}
    </div>
  );
}

export default FacilitatorView;
```

- [ ] **Step 13: Dashboard layout CSS**

In `src/styles/main.css`, replace the `.app-main:has(.presenter)` rule added in Task 4 with:

```css
/* The shared screen and the dashboard use the whole width */
.app-main:has(.presenter),
.app-main:has(.dashboard) {
  max-width: 1200px;
}
```

After the `.category-cards` rule, add:

```css
/* Facilitator dashboard: round on the left, controls and participants on the right */
.dashboard {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: calc(var(--ods-theme-column-gap) * 3);
  align-items: start;
}
```

In the `@media (max-width: 960px)` block, add:

```css
  .dashboard {
    grid-template-columns: minmax(0, 1fr);
  }
```

- [ ] **Step 14: `startVoting` now leaves the introduction**

In `src/lib/sessionStore.ts`, in `startVoting`, replace `s.phase !== 'lobby'` with `s.phase !== 'intro'`.

- [ ] **Step 15: Wire `src/pages/SessionPage.tsx`**

Replace the imports of `Lobby`, `VotingView` and `SessionFinished` with:

```tsx
import ParticipantView from '../components/ParticipantView';
import FacilitatorView, { type FacilitatorActions } from '../components/facilitator/FacilitatorView';
```

(`ParticipantView` is already imported since Task 5 — keep one import.) Change the React import to `import { useState, useEffect, useCallback, useMemo } from 'react';`.

Replace the whole `/* ─── Actions (memoised) ─── */` block (from `const handleStartVoting` through `const handleEndSession = …;`) with:

```tsx
  /* ─── Actions (memoised) ─── */
  const handleSubmitVote = useCallback(
    (color: VoteColor, trend: VoteTrend) => {
      if (session) store.submitVote(session, { color, trend }).catch(warn);
    },
    [session],
  );
  const facilitatorActions = useMemo<FacilitatorActions | null>(() => {
    if (!session) return null;
    return {
      startWorkshop: () => void store.startWorkshop(session).catch(warn),
      startVoting: () => void store.startVoting(session).catch(warn),
      submitVote: handleSubmitVote,
      reveal: () => void store.revealVotes(session).catch(warn),
      next: () => void store.nextCategory(session).catch(warn),
      end: () => void store.endSession(session).catch(warn),
      setFacilitatorVotes: (value) => void store.setFacilitatorVotes(session, value).catch(warn),
      changeNote: (index, value) =>
        void store.updateFacilitatorNote(session, index, 'notes', value).catch(warn),
    };
  }, [session, handleSubmitVote]);
```

Replace the `/* ─── Session views ─── */` block (through the end of the `if/else`) with:

```tsx
  /* ─── Session views ─── */
  const view =
    session.isFacilitator && facilitatorActions ? (
      <FacilitatorView session={session} actions={facilitatorActions} />
    ) : (
      <ParticipantView session={session} onSubmitVote={handleSubmitVote} />
    );
```

Remove `t.unknownState` usage; if `Text`/`TEXT_PRESET` are still used by the join form keep them imported (they are).

- [ ] **Step 16: Redirect the old notes URL in `src/App.tsx`**

Replace the `FacilitatorNotesPage` import with nothing, change the router import to `import { Routes, Route, Link as RouterLink, Navigate, useParams } from 'react-router-dom';`, add above `function App()`:

```tsx
/* The notes window became the facilitator view; old links and open popups land there */
function NotesRedirect() {
  const { code = '' } = useParams<{ code: string }>();
  return <Navigate to={`/session/${code}`} replace />;
}
```

and replace the notes route with:

```tsx
            <Route path="/session/:code/notes" element={<NotesRedirect />} />
```

- [ ] **Step 17: Delete the replaced files**

```bash
git rm src/components/Lobby.tsx src/components/VotingView.tsx src/components/OpenNotesButton.tsx src/pages/FacilitatorNotesPage.tsx
```

If `t.unknownState` has no remaining user (`grep -rn unknownState src`), delete it from `en` and `fr` too.

- [ ] **Step 18: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds (no unused import, no missing i18n key), all tests pass.

- [ ] **Step 19: Manual check**

`npm run dev`. A creates and joins; B and C join from two other browsers/private windows.
1. A (≥ 768px wide) lands on **Full**: left = privacy message + share; right = "Start workshop (3 voters)" + Presenter window + participants with the toggle on. Switch to **Compact** → one column; reload → still Compact.
2. A turns "I take part in the vote" off → button reads "Start workshop (2 voters)". With B and C gone (fresh session, A alone, toggle off) the button is disabled with the hint (Review Focus 1).
3. A opens the presenter window, starts the workshop → presenter shows the introduction; B sees "The workshop is starting…" + legend; A sees "Start first category".
4. Start first category → A's Full view: live round with B and C as waiting chips, no "My vote" (toggle off), note box. B votes → B's chip turns green with a check. C votes → auto-reveal; A sees results + note; presenter shows the matrix.
5. With the toggle on (new session): A sees "My vote", votes, the form resets on the next category (Review Focus 5).
6. Last category → "Finish Session" → A sees every category with its summary and an editable note, then Markdown / PDF downloads (notes included); presenter shows the recap without notes.
7. Open `…/#/session/<CODE>/notes` → redirected to the session.
8. Blocked storage is covered by `layoutMode.test.ts` (Review Focus 3); optionally, Chrome → Settings → Privacy → Site data → block `localhost`, reload A → the view renders and the toggle still switches layouts.

- [ ] **Step 20: Commit**

```bash
git add -A src
git commit -m "feat: add the facilitator view with compact and dashboard layouts"
```

---

### Task 7: README and end-to-end check

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: up-to-date README features, usage and manual test checklist.

- [ ] **Step 1: Update the features list**

In `README.md`, replace the bullets from `- **Facilitator controls**` through `- **Recap export** …` with:

```markdown
- **Three views** — a **presenter** window to screen-share (progress, category, colours, vote count, results), a phone-first **voting** view for participants, and a **facilitator** view (compact or dashboard) only the session creator can open
- **Introduction step** — a built-in presentation of the workshop between the lobby and the first category
- **Facilitator controls** — The facilitator drives the flow (start, reveal, next, end) from their own window and may opt out of voting in the lobby
- **Auto-reveal** — Votes are revealed when every voter has voted (from the facilitator's open window)
- **Private facilitator notes** — A note per category in the facilitator view, never on the shared screen; only the facilitator can read them (enforced by database rules)
- **Recap export** — The facilitator edits the notes of every category at the end and downloads results and notes as **Markdown** or **PDF**
```

- [ ] **Step 2: Update "How to Use"**

Replace the numbered list under `## How to Use` (keep the `Notes:` list below it) with:

```markdown
1. **Facilitator** clicks "Create Session" → customises categories → starts session → enters their name → lands on the facilitator view
2. Facilitator clicks **Presenter window** and shares that window (not the facilitator one)
3. **Team members** scan the QR code or open the shared link (or enter the 6-character code) → enter their name
4. In the lobby, the facilitator chooses whether they vote too ("I take part in the vote", on by default), then **Start workshop** → the introduction is on the shared screen → **Start first category**
5. For each category:
   - Everyone votes a **color** (🟢 happy / 🟠 issues / 🔴 needs fixing) and a **trend** (↗ / → / ↘) on their phone
   - The shared screen shows how many votes are in; votes are revealed when everyone has voted (or the facilitator forces reveal)
   - Team discusses; the facilitator writes the category's note in the facilitator view
   - Facilitator clicks "Next Category"
6. At the end, the shared screen shows the vote recap; the facilitator reviews every note and **downloads the report** (with notes)
```

- [ ] **Step 3: Update the manual test checklist**

Replace the numbered list under `## Manual test checklist` with:

```markdown
1. A: create a session, enter a name → facilitator view with the share link, participants (A with 👑) and "I take part in the vote" on.
2. A: click **Presenter window** → a window "Presenter — <CODE>" shows the code, QR and participants, with no buttons.
3. B: open the share link, enter a name → B appears in A's view and in the presenter window.
4. A: Start workshop → presenter shows the introduction, B sees "The workshop is starting". A: Start first category.
5. B (phone size): the vote form fits without scrolling and shows no vote counter. B votes → presenter shows "1 / 2 votes received"; A's view shows B as voted.
6. During voting, Firebase console → Realtime Database → Rules → **Rules Playground**: type *read*, location `/sessions/<CODE>/votes/<current index>`, Authenticated → **Run** → *Denied*. Also try *write* `true` at `/sessions/<CODE>/closed/<current index>` as A's UID → *Denied*.
7. A: vote → round auto-reveals on every screen with 2 votes.
8. A: write a note → nothing appears on B's screen or in the presenter window. Rules Playground: *read* `/sessions/<CODE>/facilitator`, Authenticated with B's UID → *Denied*.
9. B: reload → B lands back in the session without re-entering a name; same for A (still facilitator).
10. A: Next Category … Finish Session → presenter and B show the vote recap without notes; A edits a past note and downloads Markdown and PDF (with notes).
11. New session where A turns "I take part in the vote" off: "X / N" excludes A, A has no vote form, auto-reveal fires once B has voted. Rules Playground: *write* `true` at `/sessions/<CODE>/voters/<index>/<A's UID>` as A → *Denied*.
12. Open `…/#/session/ZZZZZZ` → "Session not found".
13. B: open `…/#/session/<CODE>/present` → "Only the facilitator can open the presenter view"; `…/#/session/<CODE>/notes` → redirected to the session.
```

- [ ] **Step 4: Full verification**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

Run the README checklist above end to end with `npm run dev` (rules already published in Task 2). Note any step that cannot be run by the implementer (Rules Playground) in the task report for the user.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe the presenter, voting and facilitator views"
```

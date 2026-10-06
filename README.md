# 🏥 Squad Health Check

A real-time collaborative tool for running **Spotify Squad Health Check** sessions with your team. Static site on GitHub Pages; realtime sync via Firebase (free plan).

## Features

- **Three views** — a **presenter** window to screen-share (progress, category, colours, vote count, results), a phone-first **voting** view for participants, and a **facilitator** dashboard view only the session creator can open
- **Introduction step** — a built-in presentation of the workshop between the lobby and the first category
- **Facilitator controls** — The facilitator drives the flow (start, reveal, next, end) from their own window and chooses at creation whether they take part in the vote
- **Live results for the facilitator** — The facilitator's view fills the vote matrix as votes arrive, once they have voted (or from the start when they don't vote); the shared screen still waits for the reveal
- **Auto-reveal** — Votes are revealed when every voter has voted (from the facilitator's open window)
- **Participant cap** — At most 15 people (facilitator included) can join a session (enforced by database rules)
- **Private facilitator notes** — A note per category in the facilitator view, never on the shared screen; only the facilitator can read them (enforced by database rules)
- **Vote anonymization** — Chosen at creation: *off* (everyone sees who voted what once a round is revealed), *facilitator only* (only the facilitator sees names; the shared screen shows totals) or *full* (totals only). Names are never visible while a round is being voted (enforced by database rules)
- **Round timer** — Every view shows the time spent on the current category; it quietly turns amber past the time slot chosen at creation (10 min by default, about 2 hours for 10 categories with the intro and wrap-up)
- **Recap export** — The facilitator edits the notes of every category at the end and downloads results and notes as **Markdown** or **PDF**

## Firebase setup (once, ~10 min)

1. [Firebase console](https://console.firebase.google.com) → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Authentication → Settings → Authorized domains** → add `<your-user>.github.io`.
4. **Build → Realtime Database → Create database** → choose a location → **locked mode**.
5. **Realtime Database → Rules** → paste [`database.rules.json`](database.rules.json) → **Publish**. Repeat whenever that file changes. Publish rule changes **before** pushing the app to `main` — the app may depend on them.
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

Notes:
- The facilitator's tab must stay open for auto-reveal and for moving on; reloading it is fine (identity is kept).
- The facilitator role is tied to the browser that created the session — don't create it from a private window you'll close.
- Two tabs in the same browser count as the same participant — use another browser or a private window to test alone.
- Known limitation: a participant tampering via devtools could submit more than one vote per round; the vote total shown in results makes this visible.

## Manual test checklist

Use two browsers (or one normal + one private window): **A** = facilitator, **B** = participant.

1. A: create a session (settings left as is), enter a name → facilitator view with the share link, participants (A with 👑) and "You take part in the vote · Vote anonymization: Off".
2. A: click **Presenter window** → a window "Presenter — <CODE>" shows the code, QR and participants, with no buttons.
3. B: open the share link, enter a name → B appears in A's view and in the presenter window.
4. A: Start workshop → presenter shows the introduction, B sees "The workshop is starting". A: Start first category.
5. B (phone size): the vote form fits without scrolling and shows no vote counter. B votes → presenter shows "1 / 2 votes received"; A's view shows B as voted.
6. During voting, Firebase console → Realtime Database → Rules → **Rules Playground**: type *read*, location `/sessions/<CODE>/votes/<current index>`, Authenticated → **Run** → *Denied*. Also try *write* `true` at `/sessions/<CODE>/closed/<current index>` as A's UID → *Denied*.
7. A: vote → round auto-reveals on every screen with 2 votes.
8. A: write a note → nothing appears on B's screen or in the presenter window. Rules Playground: *read* `/sessions/<CODE>/facilitator`, Authenticated with B's UID → *Denied*.
9. B: reload → B lands back in the session without re-entering a name; same for A (still facilitator).
10. A: Next Category … Finish Session → presenter and B show the vote recap without notes; A edits a past note and downloads Markdown and PDF (with notes).
11. New session created with "I take part in the vote" off: "X / N" excludes A, A has no vote form, auto-reveal fires once B has voted. Rules Playground: *write* `true` at `/sessions/<CODE>/voters/<index>/<A's UID>` as A → *Denied*; *write* `true` at `/sessions/<CODE>/state/facilitatorVotes` as A → *Denied*.
12. Anonymization, one session per level, Rules Playground *read* `/sessions/<CODE>/ballots/<current index>`:
    - during voting → *Denied* for A and B at every level;
    - after reveal, **Off** → *Allowed* for A and B; presenter and A's view list names;
    - after reveal, **Facilitator only** → *Allowed* for A, *Denied* for B; only A's view lists names, not the presenter;
    - after reveal, **Full** → *Denied* for A and B; no names anywhere;
    - *write* a different value (e.g. `"off"` on a Full session, `"full"` otherwise) or `null` at `/sessions/<CODE>/state/anonymity` as A → *Denied*.
13. New session created with 1 minute per category: once voting opens, A, B and the presenter show the same elapsed time; past 1:00 it turns amber and keeps counting; Next Category restarts it at 0:00. Rules Playground: *write* `5` at `/sessions/<CODE>/state/categoryMinutes` as A → *Denied*.
14. Open `…/#/session/ZZZZZZ` → "Session not found".
15. B: open `…/#/session/<CODE>/present` → "Only the facilitator can open the presenter view"; `…/#/session/<CODE>/notes` → redirected to the session.

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


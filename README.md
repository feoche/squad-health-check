# 🏥 Squad Health Check

A real-time collaborative tool for running **Spotify Squad Health Check** sessions with your team. Static site on GitHub Pages; realtime sync via Firebase (free plan).

## Features

- **Real-time voting** — Everyone joins a session and votes simultaneously
- **Anonymous votes** — Results only show aggregate counts, never who voted what; votes can't be read before the reveal (enforced by database rules)
- **Customisable categories** — Pre-loaded with the classic Spotify categories, fully editable
- **Facilitator controls** — One person controls the flow (reveal, next category, end)
- **Auto-reveal** — Votes are revealed when everyone has voted (from the facilitator's open tab)
- **Private facilitator notes** — Notes and a one-line takeaway per category, in a separate window that stays out of the screen share; only the facilitator can read them (enforced by database rules)
- **Recap export** — The facilitator downloads results, takeaways and notes as **Markdown** or **PDF** at the end

## Firebase setup (once, ~10 min)

1. [Firebase console](https://console.firebase.google.com) → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Authentication → Settings → Authorized domains** → add `<your-user>.github.io`.
4. **Build → Realtime Database → Create database** → choose a location → **locked mode**.
5. **Realtime Database → Rules** → paste [`database.rules.json`](database.rules.json) → **Publish**. Repeat whenever that file changes.
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

1. **Facilitator** clicks "Create Session" → customises categories → starts session → enters their name
2. **Team members** open the shared link (or enter the 6-character code) → enter their name
3. For each category:
   - Everyone votes a **color** (🟢 happy / 🟠 issues / 🔴 needs fixing) and a **trend** (↗ / → / ↘)
   - Votes are revealed when everyone has voted (or the facilitator forces reveal)
   - Team discusses; the facilitator writes notes and a takeaway in the **Facilitator notes** window (share the session window, not this one)
   - Facilitator clicks "Next Category"
4. At the end, everyone sees the vote recap; the facilitator **downloads the report** (with notes) from the notes window

Notes:
- The facilitator's tab must stay open for auto-reveal and for moving on; reloading it is fine (identity is kept).
- The facilitator role is tied to the browser that created the session — don't create it from a private window you'll close.
- Two tabs in the same browser count as the same participant — use another browser or a private window to test alone.
- Known limitation: a participant tampering via devtools could submit more than one vote per round; the vote total shown in results makes this visible.

## Manual test checklist

Use two browsers (or one normal + one private window): **A** = facilitator, **B** = participant.

1. A: create a session, enter a name → lobby shows A with 👑 and the share link.
2. B: open the share link, enter a name → both lobbies list A and B.
3. A: Start Voting. B: vote → A shows "1 / 2 votes received".
4. During voting, Firebase console → Realtime Database → Rules → **Rules Playground**: type *read*, location `/sessions/<CODE>/votes/<current index>`, Authenticated → **Run** → *Denied*. A's UI shows no results yet.
5. A: vote → round auto-reveals on both sides with 2 votes.
6. A: click **Facilitator notes** → a separate window "Facilitator notes — <CODE>" opens; type notes and a takeaway → B's screen shows no notes. Rules Playground: *read* `/sessions/<CODE>/facilitator`, Authenticated with B's UID → *Denied*.
7. B: reload → B lands back in the session without re-entering a name; same for A (still facilitator).
8. A: Next Category → the previous category appears in the notes window's summary with its results, even after reloading the notes window. Continue … Finish Session → both see the vote recap without notes; Markdown and PDF downloads (with takeaways and notes) work from A's notes window.
9. Open `…/#/session/ZZZZZZ` → "Session not found".
10. B: open `…/#/session/<CODE>/notes` → "Only the facilitator can open notes"; B's console shows no `PERMISSION_DENIED` for `facilitator` or `closed`.

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


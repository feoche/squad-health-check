# 🏥 Squad Health Check

A real-time collaborative tool for running **Spotify Squad Health Check** sessions with your team.

## Features

- **Real-time voting** — Everyone joins a session and votes simultaneously via WebSockets
- **Anonymous votes** — Results only show aggregate counts, never who voted what
- **Customisable categories** — Pre-loaded with the classic Spotify categories, fully editable
- **Facilitator controls** — One person controls the flow (reveal, next category, end)
- **Auto-reveal** — Votes are automatically revealed when everyone has voted
- **Discussion notes** — Facilitator can jot down key discussion points per category
- **Recap export** — Download results as **Markdown** or **PDF** at the end
- **No persistence** — Ephemeral sessions, no database needed

## Quick Start

```bash
# Install dependencies
npm install

# Start both frontend (port 3000) and backend (port 3001)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Facilitator** clicks "Create Session" → customises categories → starts session
2. **Team members** open the shared link (or enter the 6-character code) → enter their name
3. For each category:
   - Everyone votes a **color** (🟢 happy / 🟠 issues / 🔴 needs fixing) and a **trend** (↗ / → / ↘)
   - Votes are revealed when everyone has voted (or the facilitator forces reveal)
   - Team discusses, facilitator writes notes
   - Facilitator clicks "Next Category"
4. At the end, everyone can **download the recap** as Markdown or PDF

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + Socket.io |
| Styling | Custom CSS (no framework) |
| PDF export | jsPDF + jsPDF-AutoTable |

## Production

```bash
# Build the frontend
npm run build

# Start the production server (serves static files + WebSocket)
npm start
```

### Docker

```bash
docker build -t squad-health-check .
docker run -p 3001:3001 squad-health-check
```

Then open [http://localhost:3001](http://localhost:3001).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `VITE_SOCKET_URL` | `http://localhost:3001` | WebSocket server URL (client-side, build-time) |

## Project Structure

```
├── server/
│   └── index.ts          # Express + Socket.io server
├── src/
│   ├── components/       # React components
│   ├── data/             # Default categories
│   ├── pages/            # Route pages
│   ├── styles/           # CSS
│   ├── types.ts          # Shared TypeScript types
│   ├── App.tsx           # Router
│   └── main.tsx          # Entry point
├── index.html
├── package.json
├── vite.config.ts
└── Dockerfile
```


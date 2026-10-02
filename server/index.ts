import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

/* ─── Types (mirrored from src/types.ts to avoid cross-boundary imports) ─── */

interface Category {
  name: string;
  nameFr?: string;
  positiveDescription: string;
  negativeDescription: string;
}

type VoteColor = 'green' | 'orange' | 'red';
type VoteTrend = 'up' | 'stable' | 'down';

interface Vote {
  color: VoteColor;
  trend: VoteTrend;
}

type SessionPhase = 'lobby' | 'voting' | 'revealed' | 'finished';

interface ServerParticipant {
  id: string;
  name: string;
  socketId: string;
}

interface ServerSession {
  code: string;
  facilitatorId: string;
  categories: Category[];
  participants: Map<string, ServerParticipant>;
  currentCategoryIndex: number;
  phase: SessionPhase;
  votes: Map<number, Vote[]>;
  currentRoundVoters: Set<string>;
  notes: Map<number, string>;
}

interface CategoryResult {
  categoryIndex: number;
  votes: Vote[];
  notes: string;
}

interface ClientSessionState {
  code: string;
  categories: Category[];
  participants: { id: string; name: string }[];
  currentCategoryIndex: number;
  phase: SessionPhase;
  voteCount: number;
  totalParticipants: number;
  hasVoted: boolean;
  isFacilitator: boolean;
  currentResults: Vote[] | null;
  allResults: CategoryResult[];
  notes: Record<number, string>;
}

/* ─── Setup ─── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

/* ─── Resolve LAN IP ─── */

function getNetworkIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const NETWORK_IP = getNetworkIP();
const PORT_BACKEND = parseInt(process.env.PORT || '3001', 10);

/* Endpoint so the frontend can discover the host LAN IP */
app.get('/api/info', (_req, res) => {
  const port = parseInt(process.env.VITE_PORT || '3000', 10);
  res.json({ ip: NETWORK_IP, frontendPort: port, backendPort: PORT_BACKEND });
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const sessions = new Map<string, ServerSession>();
const socketToSession = new Map<string, { sessionCode: string; participantId: string }>();

/* ─── Helpers ─── */

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (sessions.has(code));
  return code;
}

function uid(): string {
  return `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getClientState(session: ServerSession, participantId: string): ClientSessionState {
  const isFacilitator = session.facilitatorId === participantId;
  const hasVoted = session.currentRoundVoters.has(participantId);

  let currentResults: Vote[] | null = null;
  if (session.phase === 'revealed') {
    currentResults = session.votes.get(session.currentCategoryIndex) ?? [];
  }

  const allResults: CategoryResult[] = [];
  if (session.phase === 'finished') {
    for (let i = 0; i < session.categories.length; i++) {
      allResults.push({
        categoryIndex: i,
        votes: session.votes.get(i) ?? [],
        notes: session.notes.get(i) ?? '',
      });
    }
  }

  const notes: Record<number, string> = {};
  session.notes.forEach((v, k) => { notes[k] = v; });

  return {
    code: session.code,
    categories: session.categories,
    participants: Array.from(session.participants.values()).map((p) => ({ id: p.id, name: p.name })),
    currentCategoryIndex: session.currentCategoryIndex,
    phase: session.phase,
    voteCount: session.currentRoundVoters.size,
    totalParticipants: session.participants.size,
    hasVoted,
    isFacilitator,
    currentResults,
    allResults,
    notes,
  };
}

function broadcastSessionState(session: ServerSession): void {
  for (const [, participant] of session.participants) {
    const state = getClientState(session, participant.id);
    io.to(participant.socketId).emit('session-updated', state);
  }
}

/* ─── Socket handlers ─── */

io.on('connection', (socket: Socket) => {
  console.log(`[connect] ${socket.id}`);

  /* Create a new session */
  socket.on('create-session', (data: { categories: Category[] }, cb: (r: any) => void) => {
    const code = generateSessionCode();
    const participantId = uid();

    const session: ServerSession = {
      code,
      facilitatorId: participantId,
      categories: data.categories,
      participants: new Map(),
      currentCategoryIndex: 0,
      phase: 'lobby',
      votes: new Map(),
      currentRoundVoters: new Set(),
      notes: new Map(),
    };

    sessions.set(code, session);
    console.log(`[session] Created ${code} with ${data.categories.length} categories`);
    cb({ success: true, code, participantId });
  });

  /* Join (or rejoin) a session */
  socket.on('join-session', (data: { code: string; name: string; participantId?: string }, cb: (r: any) => void) => {
    const session = sessions.get(data.code);
    if (!session) {
      cb({ success: false, error: 'Session not found' });
      return;
    }

    let participantId = data.participantId;

    if (participantId && session.participants.has(participantId)) {
      /* Reconnection */
      const existing = session.participants.get(participantId)!;
      socketToSession.delete(existing.socketId);
      existing.socketId = socket.id;
      existing.name = data.name;
    } else {
      /* New participant */
      participantId = participantId || uid();
      session.participants.set(participantId, {
        id: participantId,
        name: data.name,
        socketId: socket.id,
      });
    }

    socket.join(data.code);
    socketToSession.set(socket.id, { sessionCode: data.code, participantId });

    const state = getClientState(session, participantId);
    cb({ success: true, participantId, state });
    broadcastSessionState(session);
  });

  /* Facilitator starts voting on the current category */
  socket.on('start-voting', () => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const session = sessions.get(mapping.sessionCode);
    if (!session || session.facilitatorId !== mapping.participantId) return;
    if (session.phase !== 'lobby' && session.phase !== 'revealed') return;

    session.phase = 'voting';
    session.currentRoundVoters.clear();
    broadcastSessionState(session);
  });

  /* Submit an anonymous vote */
  socket.on('submit-vote', (data: { color: VoteColor; trend: VoteTrend }, cb?: (r: any) => void) => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const session = sessions.get(mapping.sessionCode);
    if (!session || session.phase !== 'voting') return;
    if (session.currentRoundVoters.has(mapping.participantId)) return;

    const votes = session.votes.get(session.currentCategoryIndex) ?? [];
    votes.push({ color: data.color, trend: data.trend });
    session.votes.set(session.currentCategoryIndex, votes);
    session.currentRoundVoters.add(mapping.participantId);

    cb?.({ success: true });

    /* Auto-reveal when everyone has voted */
    if (session.currentRoundVoters.size === session.participants.size) {
      session.phase = 'revealed';
    }

    broadcastSessionState(session);
  });

  /* Facilitator forces reveal before everyone has voted */
  socket.on('reveal-votes', () => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const session = sessions.get(mapping.sessionCode);
    if (!session || session.facilitatorId !== mapping.participantId) return;
    if (session.phase !== 'voting') return;

    session.phase = 'revealed';
    broadcastSessionState(session);
  });

  /* Facilitator moves to the next category */
  socket.on('next-category', () => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const session = sessions.get(mapping.sessionCode);
    if (!session || session.facilitatorId !== mapping.participantId) return;
    if (session.phase !== 'revealed') return;

    if (session.currentCategoryIndex < session.categories.length - 1) {
      session.currentCategoryIndex++;
      session.phase = 'voting';
      session.currentRoundVoters.clear();
      broadcastSessionState(session);
    }
  });

  /* Facilitator updates discussion notes */
  socket.on('update-notes', (data: { categoryIndex: number; notes: string }) => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const session = sessions.get(mapping.sessionCode);
    if (!session || session.facilitatorId !== mapping.participantId) return;

    session.notes.set(data.categoryIndex, data.notes);
    broadcastSessionState(session);
  });

  /* Facilitator ends the session */
  socket.on('end-session', () => {
    const mapping = socketToSession.get(socket.id);
    if (!mapping) return;
    const session = sessions.get(mapping.sessionCode);
    if (!session || session.facilitatorId !== mapping.participantId) return;

    session.phase = 'finished';
    broadcastSessionState(session);
  });

  /* Cleanup on disconnect */
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    socketToSession.delete(socket.id);
  });
});

/* ─── Serve static files in production ─── */

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

/* ─── Start ─── */

const HOST = '0.0.0.0';
httpServer.listen(PORT_BACKEND, HOST, () => {
  console.log(`🏥 Squad Health Check server running on http://${HOST}:${PORT_BACKEND}`);
  console.log(`   Network: http://${NETWORK_IP}:${PORT_BACKEND}`);
});


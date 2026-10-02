import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import Lobby from '../components/Lobby';
import VotingView from '../components/VotingView';
import SessionFinished from '../components/SessionFinished';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

function SessionPage() {
  const { code } = useParams<{ code: string }>();
  const socketRef = useRef<Socket | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  /* Read stored session data for auto-rejoin */
  const storedRaw = sessionStorage.getItem('shc-session');
  const stored: { code?: string; participantId?: string; name?: string; isFacilitator?: boolean } | null =
    storedRaw ? JSON.parse(storedRaw) : null;

  /* Connect socket and listen for state updates */
  useEffect(() => {
    const sock = io(SOCKET_URL);
    socketRef.current = sock;

    sock.on('session-updated', (state: ClientSessionState) => {
      setSession(state);
    });

    sock.on('connect', () => {
      /* Auto-rejoin on reconnect when we have stored credentials */
      if (stored && stored.code === code && stored.participantId) {
        const rejoinName = stored.name || 'Participant';
        setName(rejoinName);
        sock.emit(
          'join-session',
          { code, name: rejoinName, participantId: stored.participantId },
          (res: any) => {
            if (res.success) {
              sessionStorage.setItem(
                'shc-session',
                JSON.stringify({ ...stored, participantId: res.participantId }),
              );
              setSession(res.state);
              setJoined(true);
            }
          },
        );
      }
    });

    return () => {
      sock.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /* ─── Join handler ─── */
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const sock = socketRef.current;
    if (!name.trim() || !sock) return;
    setIsJoining(true);
    setError('');

    sock.emit(
      'join-session',
      { code, name: name.trim(), participantId: stored?.participantId },
      (res: any) => {
        setIsJoining(false);
        if (res.success) {
          sessionStorage.setItem(
            'shc-session',
            JSON.stringify({
              code,
              participantId: res.participantId,
              name: name.trim(),
              isFacilitator: stored?.code === code && stored?.isFacilitator,
            }),
          );
          setSession(res.state);
          setJoined(true);
        } else {
          setError(res.error || 'Failed to join session');
        }
      },
    );
  };

  /* ─── Actions (memoised) ─── */
  const emit = useCallback(
    (ev: string, data?: any) => socketRef.current?.emit(ev, data),
    [],
  );

  const handleStartVoting = useCallback(() => emit('start-voting'), [emit]);
  const handleSubmitVote = useCallback(
    (color: VoteColor, trend: VoteTrend) => emit('submit-vote', { color, trend }),
    [emit],
  );
  const handleRevealVotes = useCallback(() => emit('reveal-votes'), [emit]);
  const handleNextCategory = useCallback(() => emit('next-category'), [emit]);
  const handleUpdateNotes = useCallback(
    (categoryIndex: number, notes: string) =>
      emit('update-notes', { categoryIndex, notes }),
    [emit],
  );
  const handleEndSession = useCallback(() => emit('end-session'), [emit]);

  /* ─── Join form ─── */
  if (!joined) {
    return (
      <div className="join-page">
        <div className="card join-card">
          <h2>Join Session</h2>
          <p className="session-code-display">
            Session: <strong>{code}</strong>
          </p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoFocus
              required
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isJoining || !name.trim()}
            >
              {isJoining ? 'Joining…' : 'Join'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ─── Loading ─── */
  if (!session) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Connecting to session…</p>
      </div>
    );
  }

  /* ─── Session views ─── */
  switch (session.phase) {
    case 'lobby':
      return <Lobby session={session} onStartVoting={handleStartVoting} />;

    case 'voting':
    case 'revealed':
      return (
        <VotingView
          session={session}
          onSubmitVote={handleSubmitVote}
          onRevealVotes={handleRevealVotes}
          onNextCategory={handleNextCategory}
          onUpdateNotes={handleUpdateNotes}
          onEndSession={handleEndSession}
        />
      );

    case 'finished':
      return <SessionFinished session={session} />;

    default:
      return <div>Unknown session state</div>;
  }
}

export default SessionPage;



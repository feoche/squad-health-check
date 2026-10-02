import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { shouldAutoReveal } from '../lib/deriveClientState';
import * as store from '../lib/sessionStore';
import Lobby from '../components/Lobby';
import VotingView from '../components/VotingView';
import SessionFinished from '../components/SessionFinished';

const warn = (err: unknown) => console.warn('[session]', err);

function SessionPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(true);

  /* Sign in, check the session exists, and auto-rejoin if this browser already joined */
  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) setError('Session not found');
          return;
        }
        const existingName = await store.getParticipantName(code, id);
        if (cancelled) return;
        setUid(id);
        if (existingName) {
          setName(existingName);
          setJoined(true);
        }
      } catch (err) {
        if (!cancelled) setError(store.describeError(err));
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  /* Live session state once joined */
  useEffect(() => {
    if (!joined || !uid) return;
    return store.subscribeSession(code, uid, setSession);
  }, [joined, uid, code]);

  /* Connection banner (only after Firebase is known to be configured) */
  useEffect(() => {
    if (!uid) return;
    return store.subscribeConnection(setConnected);
  }, [uid]);

  /* Facilitator's tab auto-reveals when everyone has voted */
  useEffect(() => {
    if (session && shouldAutoReveal(session)) store.revealVotes(session).catch(warn);
  }, [session]);

  /* ─── Join handler ─── */
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !uid) return;
    setIsJoining(true);
    setError('');
    try {
      await store.joinSession(code, uid, trimmed);
      setJoined(true);
    } catch (err) {
      setError(store.describeError(err));
    } finally {
      setIsJoining(false);
    }
  };

  /* ─── Actions (memoised) ─── */
  const handleStartVoting = useCallback(() => {
    if (session) store.startVoting(session).catch(warn);
  }, [session]);
  const handleSubmitVote = useCallback(
    (color: VoteColor, trend: VoteTrend) => {
      if (session) store.submitVote(session, { color, trend }).catch(warn);
    },
    [session],
  );
  const handleRevealVotes = useCallback(() => {
    if (session) store.revealVotes(session).catch(warn);
  }, [session]);
  const handleNextCategory = useCallback(() => {
    if (session) store.nextCategory(session).catch(warn);
  }, [session]);
  const handleUpdateNotes = useCallback(
    (categoryIndex: number, notes: string) => {
      if (session) store.updateNotes(session, categoryIndex, notes).catch(warn);
    },
    [session],
  );
  const handleEndSession = useCallback(() => {
    if (session) store.endSession(session).catch(warn);
  }, [session]);

  /* ─── Checking / join form ─── */
  if (checking) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Connecting to session…</p>
      </div>
    );
  }

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
              maxLength={50}
              autoFocus
              required
              disabled={!uid}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!uid || isJoining || !name.trim()}
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
  let view: JSX.Element;
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
          onUpdateNotes={handleUpdateNotes}
          onEndSession={handleEndSession}
        />
      );
      break;
    case 'finished':
      view = <SessionFinished session={session} />;
      break;
    default:
      view = <div>Unknown session state</div>;
  }

  return (
    <>
      {!connected && <div className="connection-banner">Reconnecting…</div>}
      {view}
    </>
  );
}

export default SessionPage;

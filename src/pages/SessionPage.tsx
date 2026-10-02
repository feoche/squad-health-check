import { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  FormField,
  FormFieldError,
  FormFieldLabel,
  FormFieldLabelSubLabel,
  Icon,
  ICON_NAME,
  Input,
  Link,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Spinner,
  SPINNER_SIZE,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { CODE_PATTERN } from '../lib/sessionCode';
import { shouldAutoReveal } from '../lib/deriveClientState';
import * as store from '../lib/sessionStore';
import Lobby from '../components/Lobby';
import VotingView from '../components/VotingView';
import SessionFinished from '../components/SessionFinished';

const warn = (err: unknown) => console.warn('[session]', err);

function Connecting() {
  return (
    <div className="stack stack-center loading">
      <Spinner size={SPINNER_SIZE.lg} />
      <Text preset={TEXT_PRESET.paragraph}>Connecting to session…</Text>
    </div>
  );
}

function SessionView() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [name, setName] = useState('');
  const [checking, setChecking] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(true);

  /* Sign in, check the session exists, and auto-rejoin if this browser already joined */
  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    setNotFound(false);
    if (!CODE_PATTERN.test(code)) {
      setNotFound(true);
      setError('Session not found');
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) {
            setNotFound(true);
            setError('Session not found');
          }
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
    if (!trimmed) {
      setNameError('Enter your name to join the session.');
      return;
    }
    setNameError('');
    if (!uid) return;
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
  if (checking) return <Connecting />;

  if (notFound) {
    return (
      <div className="page page-narrow">
        <Card className="card-body stack-center">
          <Text preset={TEXT_PRESET.heading2}>{error}</Text>
          <Link as={RouterLink} to="/">
            <Icon name={ICON_NAME.arrowLeft} />
            Back to home
          </Link>
        </Card>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="page page-narrow">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading2}>Join Session</Text>
          <Text preset={TEXT_PRESET.paragraph}>
            Session: <Text preset={TEXT_PRESET.code}>{code}</Text>
          </Text>
          <form className="stack" onSubmit={handleJoin} noValidate>
            <FormField invalid={!!nameError}>
              <FormFieldLabel>
                Your name
                <FormFieldLabelSubLabel> - mandatory</FormFieldLabelSubLabel>
              </FormFieldLabel>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                maxLength={50}
                autoFocus
                disabled={!uid}
              />
              <FormFieldError>{nameError}</FormFieldError>
            </FormField>
            {error && (
              <Message color={MESSAGE_COLOR.critical} dismissible={false}>
                <MessageIcon name={ICON_NAME.hexagonExclamation} />
                <MessageBody>{error}</MessageBody>
              </Message>
            )}
            <Button type="submit" loading={isJoining} disabled={!uid}>
              Join
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  /* ─── Loading ─── */
  if (!session) return <Connecting />;

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
      view = <Text preset={TEXT_PRESET.paragraph}>Unknown session state</Text>;
  }

  return (
    <>
      {!connected && (
        <Message
          className="connection-banner"
          color={MESSAGE_COLOR.warning}
          dismissible={false}
        >
          <MessageIcon name={ICON_NAME.triangleExclamation} />
          <MessageBody>Reconnecting…</MessageBody>
        </Message>
      )}
      {view}
    </>
  );
}

/* Remount per code so navigating between sessions resets all state */
function SessionPage() {
  const { code = '' } = useParams<{ code: string }>();
  return <SessionView key={code} />;
}

export default SessionPage;

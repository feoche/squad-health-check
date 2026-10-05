import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
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
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { CODE_PATTERN } from '../lib/sessionCode';
import { shouldAutoReveal } from '../lib/deriveClientState';
import * as store from '../lib/sessionStore';
import { t } from '../lib/i18n';
import ParticipantView from '../components/ParticipantView';
import FacilitatorView, { type FacilitatorActions } from '../components/facilitator/FacilitatorView';
import { Connecting, SessionNotice } from '../components/SessionStatus';

const warn = (err: unknown) => console.warn('[session]', err);

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
      setError(t.sessionNotFound);
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) {
            setNotFound(true);
            setError(t.sessionNotFound);
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
      setNameError(t.join.nameMissing);
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

  /* ─── Checking / join form ─── */
  if (checking) return <Connecting />;

  if (notFound) return <SessionNotice title={error} backTo="/" backLabel={t.backToHome} />;

  if (!joined) {
    return (
      <div className="page page-narrow">
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading2}>{t.join.title}</Text>
          <Text preset={TEXT_PRESET.paragraph}>
            {t.join.session} <Text preset={TEXT_PRESET.code}>{code}</Text>
          </Text>
          <form className="stack" onSubmit={handleJoin} noValidate>
            <FormField invalid={!!nameError}>
              <FormFieldLabel>
                {t.join.yourName}
                <FormFieldLabelSubLabel>{t.mandatory}</FormFieldLabelSubLabel>
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
              {t.join.button}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  /* ─── Loading ─── */
  if (!session) return <Connecting />;

  /* ─── Session views ─── */
  const view =
    session.isFacilitator && facilitatorActions ? (
      <FacilitatorView session={session} actions={facilitatorActions} />
    ) : (
      <ParticipantView session={session} onSubmitVote={handleSubmitVote} />
    );

  return (
    <>
      {!connected && (
        <Message
          className="connection-banner"
          color={MESSAGE_COLOR.warning}
          dismissible={false}
        >
          <MessageIcon name={ICON_NAME.triangleExclamation} />
          <MessageBody>{t.reconnecting}</MessageBody>
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

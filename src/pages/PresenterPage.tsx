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

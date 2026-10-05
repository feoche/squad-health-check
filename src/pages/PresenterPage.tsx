import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClientSessionState } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { CODE_PATTERN } from '../lib/sessionCode';
import * as store from '../lib/sessionStore';
import { t } from '../lib/i18n';
import { useLang } from '../lib/useLang';
import { Connecting, SessionNotice } from '../components/SessionStatus';
import PresenterView from '../components/PresenterView';

/** Never joins as a participant, so opening it does not change the head count. */
function PresenterScreen() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [notFound, setNotFound] = useState(false);
  /** Kept raw and described at render time, so it follows language switches */
  const [error, setError] = useState<unknown>(null);
  const lang = useLang();

  /* Distinct title so this window is easy to pick in the screen-share dialog */
  useEffect(() => {
    const previous = document.title;
    document.title = t.presenter.documentTitle(code);
    return () => {
      document.title = previous;
    };
  }, [code, lang]);

  useEffect(() => {
    let cancelled = false;
    if (!CODE_PATTERN.test(code)) {
      setNotFound(true);
      return;
    }
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!(await store.sessionExists(code))) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!cancelled) setUid(id);
      } catch (err) {
        if (!cancelled) setError(err);
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

  if (notFound || error != null) {
    const title = notFound ? t.sessionNotFound : store.describeError(error);
    return <SessionNotice title={title} backTo="/" backLabel={t.backToHome} />;
  }
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

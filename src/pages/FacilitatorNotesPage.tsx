import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  BADGE_COLOR,
  type BadgeColor,
  Button,
  BUTTON_VARIANT,
  Card,
  Icon,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, FacilitatorNote, SessionPhase } from '../types';
import { ensureSignedIn } from '../lib/firebase';
import { CODE_PATTERN } from '../lib/sessionCode';
import { summaryIndexes } from '../lib/deriveClientState';
import { downloadMarkdown, downloadPDF } from '../lib/exportReport';
import * as store from '../lib/sessionStore';
import { t } from '../lib/i18n';
import { localizeCategory } from '../lib/localizeCategory';
import { Connecting, SessionNotice } from '../components/SessionStatus';
import NoteFields from '../components/NoteFields';
import VoteSummary from '../components/VoteSummary';

const warn = (err: unknown) => console.warn('[notes]', err);

const EMPTY_NOTE: FacilitatorNote = { notes: '' };

const PHASE_BADGE: Record<SessionPhase, BadgeColor> = {
  lobby: BADGE_COLOR.neutral,
  voting: BADGE_COLOR.information,
  revealed: BADGE_COLOR.success,
  finished: BADGE_COLOR.primary,
};

function FacilitatorNotesView() {
  const { code = '' } = useParams<{ code: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [session, setSession] = useState<ClientSessionState | null>(null);
  const [error, setError] = useState('');

  /* Distinct title so this window is easy to leave out of the screen-share picker */
  useEffect(() => {
    const previous = document.title;
    document.title = t.notes.documentTitle(code);
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

  const handleChange = useCallback(
    (categoryIndex: number, field: store.NoteField, value: string) => {
      if (session) store.updateFacilitatorNote(session, categoryIndex, field, value).catch(warn);
    },
    [session],
  );

  if (error) return <SessionNotice title={error} backTo="/" backLabel={t.backToHome} />;
  if (!session) return <Connecting />;
  if (!session.isFacilitator) {
    return (
      <SessionNotice
        title={t.notes.onlyFacilitator}
        backTo={`/session/${code}`}
        backLabel={t.notes.backToSession}
      />
    );
  }
  if (!session.facilitatorNotesLoaded) return <Connecting />;

  const { phase, currentCategoryIndex: current, categories } = session;
  const noteAt = (i: number) => session.facilitatorNotes[i] ?? EMPTY_NOTE;
  const past = summaryIndexes(session);

  return (
    <div className="page">
      <div className="session-header">
        <Text preset={TEXT_PRESET.heading2} className="grow">
          {t.notes.button}
        </Text>
        <Badge color={BADGE_COLOR.neutral}>{t.code(code)}</Badge>
        <Badge color={PHASE_BADGE[phase]}>{t.notes.phases[phase]}</Badge>
      </div>

      <Message color={MESSAGE_COLOR.information} dismissible={false}>
        <MessageIcon name={ICON_NAME.circleInfo} />
        <MessageBody>{t.notes.privacy}</MessageBody>
      </Message>

      {(phase === 'voting' || phase === 'revealed') && (
        <Card className="card-body">
          <Text preset={TEXT_PRESET.label}>
            {t.categoryOf(current + 1, categories.length)}
          </Text>
          <Text preset={TEXT_PRESET.heading3}>{localizeCategory(categories[current]).title}</Text>
          {phase === 'voting' ? (
            <Text preset={TEXT_PRESET.paragraph}>
              {t.votesReceived(session.voteCount, session.totalParticipants)}
            </Text>
          ) : session.currentResults ? (
            <VoteSummary votes={session.currentResults} />
          ) : (
            <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
          )}
          <NoteFields
            key={current}
            note={noteAt(current)}
            onChange={(field, value) => handleChange(current, field, value)}
          />
        </Card>
      )}

      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading3}>{t.notes.summary}</Text>
        {past.length === 0 ? (
          <Text preset={TEXT_PRESET.paragraph}>
            {phase === 'lobby' ? t.notes.notStarted : t.notes.appearLater}
          </Text>
        ) : (
          past.map((i) => (
            <div key={i} className="stack summary-item">
              <Text preset={TEXT_PRESET.heading5}>
                {i + 1}. {localizeCategory(categories[i]).title}
              </Text>
              {session.categoryResults[i] ? (
                <VoteSummary votes={session.categoryResults[i]} />
              ) : (
                <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
              )}
              <NoteFields
                note={noteAt(i)}
                onChange={(field, value) => handleChange(i, field, value)}
              />
            </div>
          ))
        )}
      </Card>

      {phase === 'finished' && (
        <div className="actions">
          <Button onClick={() => downloadMarkdown(session)}>
            <Icon name={ICON_NAME.download} />
            {t.notes.downloadMarkdown}
          </Button>
          <Button
            variant={BUTTON_VARIANT.outline}
            onClick={() => downloadPDF(session).catch(warn)}
          >
            <Icon name={ICON_NAME.download} />
            {t.notes.downloadPdf}
          </Button>
        </div>
      )}
    </div>
  );
}

/* Remount per code so navigating between sessions resets all state */
function FacilitatorNotesPage() {
  const { code = '' } = useParams<{ code: string }>();
  return <FacilitatorNotesView key={code} />;
}

export default FacilitatorNotesPage;

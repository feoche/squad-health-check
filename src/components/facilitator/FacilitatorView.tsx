import {
  Card,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { useEffect, useState } from 'react';
import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../../types';
import { t } from '../../lib/i18n';
import {
  clearPreviousSession,
  loadPreviousSession,
  saveLastSession,
  savePreviousSession,
  findPrevious,
  SessionExport,
  toSessionExport,
} from '../../lib/sessionHistory';
import OpenPresenterButton from '../OpenPresenterButton';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import ResultsGrid from '../ResultsGrid';
import VoteSummary from '../VoteSummary';
import PreviousResult from './PreviousResult';
import SessionProgress from '../SessionProgress';
import SharePanel from '../SharePanel';
import CurrentCategory from './CurrentCategory';
import FacilitatorControls from './FacilitatorControls';
import FinishedNotes from './FinishedNotes';
import ParticipantsPanel from './ParticipantsPanel';
import ReportExports from './ReportExports';

export interface FacilitatorActions {
  startWorkshop: () => void;
  startVoting: () => void;
  submitVote: (color: VoteColor, trend: VoteTrend) => void;
  reveal: () => void;
  next: () => void;
  end: () => void;
  /** Adds or removes, in the current round, a vote for someone present but not connected */
  adjustOfflineVote: (vote: Vote, delta: 1 | -1) => void;
  /** Removes every vote added that way in the current round */
  resetOfflineVotes: () => void;
  changeNote: (categoryIndex: number, value: string) => void;
}

interface Props {
  session: ClientSessionState;
  actions: FacilitatorActions;
}

/** The presenter hint is dismissed per session, so it comes back for each new one */
const hintDismissedKey = (code: string) => `presenterHintDismissed:${code}`;

/** Whether the facilitator already closed the presenter hint in this session (storage may be missing or blocked) */
function hintDismissed(code: string): boolean {
  try {
    return localStorage.getItem(hintDismissedKey(code)) === '1';
  } catch {
    return false;
  }
}

/** The session creator's window: drives the session, keeps private notes, never shared. */
function FacilitatorView({ session, actions }: Props) {
  const { phase, currentCategoryIndex: current } = session;
  const inRound = phase === 'voting' || phase === 'revealed';
  const [showHint, setShowHint] = useState(() => !hintDismissed(session.code));
  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(hintDismissedKey(session.code), '1');
    } catch {
      /* Storage blocked: the hint stays closed until the page is reloaded */
    }
  };

  const [previous, setPrevious] = useState(() => loadPreviousSession(session.code));
  const importPrevious = (data: SessionExport) => {
    setPrevious(data);
    savePreviousSession(session.code, data);
  };
  const removePrevious = () => {
    setPrevious(null);
    clearPreviousSession(session.code);
  };

  /* Once finished, this session is the previous one of the next created in this browser; note edits keep it current */
  useEffect(() => {
    if (phase === 'finished' && session.facilitatorNotesLoaded) saveLastSession(toSessionExport(session));
  }, [phase, session]);

  const loadingNotes = <Text preset={TEXT_PRESET.caption}>{t.facilitator.loadingNotes}</Text>;

  const controls = <FacilitatorControls session={session} actions={actions} />;

  /* Shown from the reveal only, so the facilitator runs the round without last time's result in mind */
  const previousOfRound = findPrevious(previous, session.categories[current]);

  const offline = {
    offlineVotes: session.offlineVotes[current],
    onAdjust: actions.adjustOfflineVote,
    onResetOffline: actions.resetOfflineVotes,
  };

  const category = (
    <CurrentCategory
      session={session}
      onSubmitVote={actions.submitVote}
      voteCount={(phase === 'voting' ? session.liveResults : session.currentResults)?.length}
    >
      {phase === 'voting' && session.liveResults && (
        <ResultsGrid votes={session.liveResults} inline {...offline} />
      )}
      {phase === 'revealed' &&
        (session.currentResults ? (
          <>
            <ResultsGrid
              votes={session.currentResults}
              namedVotes={session.namedVotes[current]}
              inline
              {...offline}
            />
            <div className="inline wrap facilitator-view__round-summary">
              <VoteSummary votes={session.currentResults} />
              {previousOfRound && <PreviousResult previous={previousOfRound} votes={session.currentResults} />}
            </div>
          </>
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}
    </CurrentCategory>
  );

  const notes = (
    <Card className="card-body facilitator-view__notes">
      {session.facilitatorNotesLoaded ? (
        <NoteFields
          key={current}
          note={session.facilitatorNotes[current] ?? EMPTY_NOTE}
          onChange={(_field, value) => actions.changeNote(current, value)}
        />
      ) : (
        loadingNotes
      )}
    </Card>
  );

  const main = (
    <>
      {phase === 'lobby' && (
        <Card className="card-body facilitator-view__share">
          <SharePanel code={session.code} />
        </Card>
      )}

      {phase === 'intro' && (
        <Card className="card-body facilitator-view__intro-script">
          <Text preset={TEXT_PRESET.heading3} as="h2">{t.facilitator.introScriptTitle}</Text>
          {[
            ...t.facilitator.introScript,
            `${t.intro.anonymity[session.anonymity]} ${t.facilitator.introScriptEnd}`,
          ].map((paragraph) => (
            <Text key={paragraph} preset={TEXT_PRESET.paragraph}>
              {paragraph}
            </Text>
          ))}
        </Card>
      )}

      {phase === 'finished' &&
        (session.facilitatorNotesLoaded ? (
          <FinishedNotes session={session} previous={previous} onChangeNote={actions.changeNote} />
        ) : (
          loadingNotes
        ))}
    </>
  );

  const side = (
    <>
      {phase === 'finished' ? (
        <ReportExports session={session} previous={previous} onImport={importPrevious} onRemove={removePrevious} />
      ) : (
        controls
      )}
      <ParticipantsPanel session={session} />
    </>
  );

  // During a round: the category and my vote | notes, then who has voted with the round controls
  const body = inRound ? (
    <div className="facilitator-view__dashboard facilitator-view__dashboard--round">
      <div className="stack facilitator-view__main">{category}</div>
      <div className="stack facilitator-view__side">
        {notes}
        {controls}
      </div>
    </div>
  ) : (
    <div className="facilitator-view__dashboard">
      <div className="stack facilitator-view__main">{main}</div>
      <div className="stack facilitator-view__side">{side}</div>
    </div>
  );

  return (
    <div className={`page facilitator-view facilitator-view--${phase}`}>
      <SessionProgress session={session}>
        <OpenPresenterButton inHeader code={session.code} />
      </SessionProgress>

      {phase === 'lobby' && showHint && (
        <Message
          className="message-full facilitator-view__presenter-hint"
          color={MESSAGE_COLOR.information}
          onRemove={dismissHint}
        >
          <MessageIcon name={ICON_NAME.circleInfo} />
          <MessageBody>
            <div className="stack">
              {t.presenter.hint}
              <OpenPresenterButton className="self-start" code={session.code} />
            </div>
          </MessageBody>
        </Message>
      )}

      {body}
    </div>
  );
}

export default FacilitatorView;

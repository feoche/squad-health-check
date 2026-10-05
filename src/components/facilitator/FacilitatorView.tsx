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
import { useState } from 'react';
import { ClientSessionState, VoteColor, VoteTrend } from '../../types';
import { t } from '../../lib/i18n';
import OpenPresenterButton from '../OpenPresenterButton';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import ResultsGrid from '../ResultsGrid';
import SessionProgress from '../SessionProgress';
import SharePanel from '../SharePanel';
import CurrentCategory from './CurrentCategory';
import FacilitatorControls from './FacilitatorControls';
import FinishedNotes from './FinishedNotes';
import ParticipantsPanel from './ParticipantsPanel';

export interface FacilitatorActions {
  startWorkshop: () => void;
  startVoting: () => void;
  submitVote: (color: VoteColor, trend: VoteTrend) => void;
  reveal: () => void;
  next: () => void;
  end: () => void;
  setFacilitatorVotes: (value: boolean) => void;
  changeNote: (categoryIndex: number, value: string) => void;
}

interface Props {
  session: ClientSessionState;
  actions: FacilitatorActions;
}

const HINT_DISMISSED_KEY = 'presenterHintDismissed';

/** Whether the facilitator already closed the presenter hint (storage may be missing or blocked) */
function hintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** The session creator's window: drives the session, keeps private notes, never shared. */
function FacilitatorView({ session, actions }: Props) {
  const { phase, currentCategoryIndex: current } = session;
  const inRound = phase === 'voting' || phase === 'revealed';
  const [showHint, setShowHint] = useState(() => !hintDismissed());
  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, '1');
    } catch {
      /* Storage blocked: the hint stays closed until the page is reloaded */
    }
  };
  const loadingNotes = <Text preset={TEXT_PRESET.caption}>{t.facilitator.loadingNotes}</Text>;

  const controls = <FacilitatorControls session={session} actions={actions} />;

  const category = (
    <CurrentCategory session={session} onSubmitVote={actions.submitVote}>
      {phase === 'voting' && session.liveResults && (
        <ResultsGrid votes={session.liveResults} inline />
      )}
      {phase === 'revealed' &&
        (session.currentResults ? (
          <ResultsGrid votes={session.currentResults} inline />
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
          <Text preset={TEXT_PRESET.heading3}>{t.facilitator.introScriptTitle}</Text>
          {t.facilitator.introScript.map((paragraph) => (
            <Text key={paragraph} preset={TEXT_PRESET.paragraph}>
              {paragraph}
            </Text>
          ))}
        </Card>
      )}

      {phase === 'finished' &&
        (session.facilitatorNotesLoaded ? (
          <FinishedNotes session={session} onChangeNote={actions.changeNote} />
        ) : (
          loadingNotes
        ))}
    </>
  );

  const side = (
    <>
      {controls}
      <ParticipantsPanel session={session} onSetFacilitatorVotes={actions.setFacilitatorVotes} />
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
      <SessionProgress session={session} />

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

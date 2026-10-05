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
import { ClientSessionState, VoteColor, VoteTrend } from '../../types';
import { t } from '../../lib/i18n';
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

/** The session creator's window: drives the session, keeps private notes, never shared. */
function FacilitatorView({ session, actions }: Props) {
  const { phase, currentCategoryIndex: current } = session;
  const inRound = phase === 'voting' || phase === 'revealed';
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
    <Card className="card-body">
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
        <>
          <Message color={MESSAGE_COLOR.information} dismissible={false}>
            <MessageIcon name={ICON_NAME.circleInfo} />
            <MessageBody>{t.notes.privacy}</MessageBody>
          </Message>
          <Card className="card-body">
            <SharePanel code={session.code} />
          </Card>
        </>
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
    <div className="dashboard dashboard-round">
      <div className="stack">{category}</div>
      <div className="stack">
        {notes}
        {controls}
      </div>
    </div>
  ) : (
    <div className="dashboard">
      <div className="stack">{main}</div>
      <div className="stack">{side}</div>
    </div>
  );

  return (
    <div className="page">
      <SessionProgress session={session} />

      {body}
    </div>
  );
}

export default FacilitatorView;

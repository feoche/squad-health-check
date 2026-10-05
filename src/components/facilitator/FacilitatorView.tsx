import {
  Card,
  ICON_NAME,
  Message,
  MESSAGE_COLOR,
  MessageBody,
  MessageIcon,
  Switch,
  SWITCH_SIZE,
  SwitchItem,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../../types';
import { LayoutMode } from '../../lib/layoutMode';
import { t } from '../../lib/i18n';
import NoteFields, { EMPTY_NOTE } from '../NoteFields';
import ResultsGrid from '../ResultsGrid';
import SessionProgress from '../SessionProgress';
import SharePanel from '../SharePanel';
import VoteSubmitted from '../VoteSubmitted';
import VotingPanel from '../VotingPanel';
import FacilitatorControls from './FacilitatorControls';
import FinishedNotes from './FinishedNotes';
import LiveRound from './LiveRound';
import ParticipantsPanel from './ParticipantsPanel';
import { useLayoutMode } from './useLayoutMode';

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
  const [layout, setLayout] = useLayoutMode();
  const { phase, currentCategoryIndex: current } = session;
  const inRound = phase === 'voting' || phase === 'revealed';
  const loadingNotes = <Text preset={TEXT_PRESET.caption}>{t.facilitator.loadingNotes}</Text>;

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

      {inRound && <LiveRound session={session} />}

      {phase === 'voting' && session.facilitatorVotes && (
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading4}>{t.facilitator.myVote}</Text>
          {session.hasVoted ? (
            <VoteSubmitted />
          ) : (
            <VotingPanel
              key={current}
              category={session.categories[current]}
              onSubmitVote={actions.submitVote}
            />
          )}
        </Card>
      )}

      {phase === 'revealed' &&
        (session.currentResults ? (
          <ResultsGrid votes={session.currentResults} />
        ) : (
          <Text preset={TEXT_PRESET.caption}>{t.loadingResults}</Text>
        ))}

      {inRound && (
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
      <FacilitatorControls session={session} actions={actions} />
      {(layout === 'full' || phase === 'lobby') && (
        <ParticipantsPanel session={session} onSetFacilitatorVotes={actions.setFacilitatorVotes} />
      )}
    </>
  );

  return (
    <div className="page">
      <SessionProgress session={session}>
        <Switch
          className="layout-toggle"
          size={SWITCH_SIZE.sm}
          value={layout}
          onValueChange={({ value }) => setLayout(value as LayoutMode)}
          aria-label={t.facilitator.layout}
        >
          <SwitchItem value="compact">{t.facilitator.compact}</SwitchItem>
          <SwitchItem value="full">{t.facilitator.full}</SwitchItem>
        </Switch>
      </SessionProgress>

      {layout === 'full' ? (
        <div className="dashboard">
          <div className="stack">{main}</div>
          <div className="stack">{side}</div>
        </div>
      ) : (
        <>
          {side}
          {main}
        </>
      )}
    </div>
  );
}

export default FacilitatorView;

import { useRef } from 'react';
import {
  Button,
  BUTTON_VARIANT,
  Card,
  CARD_COLOR,
  Icon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { canStartWorkshop } from '../../lib/deriveClientState';
import { t } from '../../lib/i18n';
import { useFocusIfLost } from '../../lib/useFocusIfLost';
import LiveRound from './LiveRound';
import type { FacilitatorActions } from './FacilitatorView';

interface Props {
  session: ClientSessionState;
  actions: FacilitatorActions;
}

/** The round's vote count, then the one action that moves the session forward in each phase. */
function FacilitatorControls({ session, actions }: Props) {
  const { phase, voteCount, totalVoters } = session;
  const isLastCategory = session.currentCategoryIndex === session.categories.length - 1;
  const canStart = canStartWorkshop(session);
  /* Votes added for people without the app are enough to reveal */
  const anyVote = voteCount > 0 || Boolean(session.offlineVotes[session.currentCategoryIndex]?.length);
  /* The dashboard is rebuilt when a round starts, which drops the focus: bring it back here */
  const button = useRef<HTMLButtonElement>(null);
  useFocusIfLost(button);

  /* One button whose action follows the phase: the same element stays focused from one step to the next */
  const action =
    phase === 'lobby'
      ? { label: t.facilitator.startWorkshop(totalVoters), onClick: actions.startWorkshop, disabled: !canStart }
      : phase === 'intro'
        ? { label: t.facilitator.startFirst, onClick: actions.startVoting, icon: ICON_NAME.arrowRight }
        : phase === 'voting'
          ? {
              label: t.voting.revealNowCount(voteCount, totalVoters),
              onClick: actions.reveal,
              disabled: !anyVote,
              variant: anyVote ? BUTTON_VARIANT.default : BUTTON_VARIANT.outline,
            }
          : phase === 'revealed'
            ? isLastCategory
              ? { label: t.results.finish, onClick: actions.end, icon: ICON_NAME.check }
              : { label: t.results.next, onClick: actions.next, icon: ICON_NAME.arrowRight }
            : null;

  return (
    <Card className="card-body facilitator-controls" color={CARD_COLOR.neutral}>
      {(phase === 'voting' || phase === 'revealed') && <LiveRound session={session} />}
      {phase === 'intro' && <Text preset={TEXT_PRESET.paragraph}>{t.facilitator.introHint}</Text>}
      {action && (
        <Button ref={button} variant={action.variant} onClick={action.onClick} disabled={action.disabled}>
          {action.label}
          {action.icon && <Icon name={action.icon} />}
        </Button>
      )}
      {phase === 'lobby' && !canStart && <Text preset={TEXT_PRESET.caption}>{t.facilitator.needVoter}</Text>}
      {/* Votes arrive while the facilitator looks elsewhere: read the count out as it changes */}
      <span role="status" className="visually-hidden">
        {phase === 'voting' ? t.votesReceived(voteCount, totalVoters) : ''}
      </span>
    </Card>
  );
}

export default FacilitatorControls;

import {
  Button,
  BUTTON_VARIANT,
  Card,
  Icon,
  ICON_NAME,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { canStartWorkshop } from '../../lib/deriveClientState';
import { t } from '../../lib/i18n';
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

  return (
    <Card className="card-body facilitator-controls">
      {(phase === 'voting' || phase === 'revealed') && <LiveRound session={session} />}

      {phase === 'lobby' && (
        <>
          <Button onClick={actions.startWorkshop} disabled={!canStart}>
            {t.facilitator.startWorkshop(totalVoters)}
          </Button>
          {!canStart && <Text preset={TEXT_PRESET.caption}>{t.facilitator.needVoter}</Text>}
        </>
      )}

      {phase === 'intro' && (
        <>
          <Text preset={TEXT_PRESET.paragraph}>{t.facilitator.introHint}</Text>
          <Button onClick={actions.startVoting}>
            {t.facilitator.startFirst}
            <Icon name={ICON_NAME.arrowRight} />
          </Button>
        </>
      )}

      {phase === 'voting' && (
        <Button
          variant={voteCount > 0 ? BUTTON_VARIANT.default : BUTTON_VARIANT.outline}
          onClick={actions.reveal}
          disabled={voteCount === 0}
        >
          {t.voting.revealNowCount(voteCount, totalVoters)}
        </Button>
      )}

      {phase === 'revealed' &&
        (isLastCategory ? (
          <Button onClick={actions.end}>
            {t.results.finish}
            <Icon name={ICON_NAME.check} />
          </Button>
        ) : (
          <Button onClick={actions.next}>
            {t.results.next}
            <Icon name={ICON_NAME.arrowRight} />
          </Button>
        ))}
    </Card>
  );
}

export default FacilitatorControls;

import { Card, CARD_COLOR, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';
import ParticipantBadges from '../ParticipantBadges';

/** Settings were chosen at creation and can't change, so they are only shown here. */
function ParticipantsPanel({ session }: { session: ClientSessionState }) {
  return (
    <Card className="card-body participants-panel" color={CARD_COLOR.neutral}>
      <Text preset={TEXT_PRESET.heading4} as="h2">
        {t.lobby.participants(session.participants.length)}
      </Text>
      <ParticipantBadges
        participants={session.participants}
        facilitatorId={session.facilitatorId}
        myId={session.myId}
      />
      <Text preset={TEXT_PRESET.caption} className="participants-panel__settings">
        {session.facilitatorVotes ? t.settings.youVote : t.settings.youDontVote}
        {' · '}
        {t.settings.anonymity}: {t.settings.levels[session.anonymity]}
      </Text>
    </Card>
  );
}

export default ParticipantsPanel;

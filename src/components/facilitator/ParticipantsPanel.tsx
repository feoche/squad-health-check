import { Card, Text, TEXT_PRESET, Toggle, ToggleControl, ToggleLabel } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';
import ParticipantBadges from '../ParticipantBadges';

interface Props {
  session: ClientSessionState;
  onSetFacilitatorVotes: (value: boolean) => void;
}

function ParticipantsPanel({ session, onSetFacilitatorVotes }: Props) {
  const locked = session.phase !== 'lobby';

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading4}>
        {t.lobby.participants(session.participants.length)}
      </Text>
      <ParticipantBadges
        participants={session.participants}
        facilitatorId={session.facilitatorId}
        myId={session.myId}
      />
      <Toggle
        checked={session.facilitatorVotes}
        disabled={locked}
        onCheckedChange={({ checked }) => onSetFacilitatorVotes(checked)}
      >
        <ToggleControl />
        <ToggleLabel>{t.facilitator.facilitatorVotes}</ToggleLabel>
      </Toggle>
      {locked && <Text preset={TEXT_PRESET.caption}>{t.facilitator.facilitatorVotesHint}</Text>}
    </Card>
  );
}

export default ParticipantsPanel;

import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { Participant } from '../types';
import { t } from '../lib/i18n';

interface Props {
  participants: Participant[];
  facilitatorId: string;
  /** Highlights the current user; omit on screens nobody "is" (the presenter) */
  myId?: string;
}

function ParticipantBadges({ participants, facilitatorId, myId }: Props) {
  // The facilitator's badge leads, the rest keep their joining order
  const ordered = [...participants].sort(
    (a, b) => Number(b.id === facilitatorId) - Number(a.id === facilitatorId),
  );

  return (
    <div className="inline wrap">
      {ordered.map((p) => (
        <Badge key={p.id} color={p.id === myId ? BADGE_COLOR.primary : BADGE_COLOR.neutral}>
          {p.id === facilitatorId && <Icon name={ICON_NAME.crown} />}
          {p.name}
          {p.id === myId && t.lobby.you}
        </Badge>
      ))}
    </div>
  );
}

export default ParticipantBadges;

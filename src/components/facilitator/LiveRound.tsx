import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';

/** Who has voted in the current round — names only, never how they voted. */
function LiveRound({ session }: { session: ClientSessionState }) {
  const voted = new Set(session.voterIds);

  return (
    <div className="inline wrap">
      {session.eligibleVoters.map((p) => {
        const hasVoted = voted.has(p.id);
        return (
          <Badge key={p.id} color={hasVoted ? BADGE_COLOR.success : BADGE_COLOR.neutral}>
            {hasVoted && <Icon name={ICON_NAME.check} />}
            {p.id === session.facilitatorId && <Icon name={ICON_NAME.crown} />}
            {p.name}
            <span className="visually-hidden">
              {' — '}
              {hasVoted ? t.facilitator.voted : t.facilitator.waiting}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}

export default LiveRound;

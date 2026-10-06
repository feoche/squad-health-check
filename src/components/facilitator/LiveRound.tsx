import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';

/** Who has voted in the current round — names only, never how they voted. */
function LiveRound({ session }: { session: ClientSessionState }) {
  const voted = new Set(session.voterIds);

  return (
    <ul className="inline wrap live-round">
      {session.eligibleVoters.map((p) => {
        const hasVoted = voted.has(p.id);
        return (
          <li key={p.id} className="live-round__item">
            <Badge
              className={hasVoted ? 'live-round__voter live-round__voter--voted' : 'live-round__voter'}
              color={hasVoted ? BADGE_COLOR.success : BADGE_COLOR.neutral}>
              {hasVoted && <Icon name={ICON_NAME.check} />}
              {p.id === session.facilitatorId && <Icon name={ICON_NAME.crown} />}
              {p.name}
              <span className="visually-hidden">
                {p.id === session.facilitatorId && t.lobby.facilitator}
                {' — '}
                {hasVoted ? t.facilitator.voted : t.facilitator.waiting}
              </span>
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

export default LiveRound;

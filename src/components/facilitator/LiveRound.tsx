import { Badge, BADGE_COLOR, Icon, ICON_NAME } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';

/** Who has voted in the current round, and who has no app connected — names only, never how they voted. */
function LiveRound({ session }: { session: ClientSessionState }) {
  const voted = new Set(session.voterIds);
  const disconnected = new Set(session.disconnectedIds);

  return (
    <ul className="inline wrap live-round">
      {session.eligibleVoters.map((p) => {
        const hasVoted = voted.has(p.id);
        const isDisconnected = disconnected.has(p.id);
        const className = [
          'live-round__voter',
          hasVoted && 'live-round__voter--voted',
          isDisconnected && 'live-round__voter--disconnected',
        ].filter(Boolean).join(' ');
        return (
          <li key={p.id} className="live-round__item">
            <Badge
              className={className}
              color={hasVoted ? BADGE_COLOR.success : BADGE_COLOR.neutral}>
              {hasVoted && <Icon name={ICON_NAME.check} />}
              {isDisconnected && <Icon name={ICON_NAME.cloudXmark} />}
              {p.id === session.facilitatorId && <Icon name={ICON_NAME.crown} />}
              {p.name}
              <span className="visually-hidden">
                {p.id === session.facilitatorId && t.lobby.facilitator}
                {' — '}
                {hasVoted ? t.facilitator.voted : t.facilitator.waiting}
                {isDisconnected && `, ${t.facilitator.disconnected}`}
              </span>
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

export default LiveRound;

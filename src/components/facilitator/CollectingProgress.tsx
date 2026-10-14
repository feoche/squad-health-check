import { Badge, BADGE_COLOR, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { completedVoterCount } from '../../lib/deriveClientState';
import { t } from '../../lib/i18n';

/** How far each voter got in an async session's voting window: names and counts only, never what they voted. */
function CollectingProgress({ session }: { session: ClientSessionState }) {
  const total = session.categories.length;
  return (
    <>
      <Text preset={TEXT_PRESET.paragraph} role="status">
        {t.collecting.participation(completedVoterCount(session), session.totalVoters)}
      </Text>
      <ul className="inline wrap live-round">
        {session.eligibleVoters.map((p) => {
          const n = session.answeredCounts[p.id] ?? 0;
          const complete = n >= total;
          return (
            <li key={p.id} className="live-round__item">
              <Badge
                className={`live-round__voter${complete ? ' live-round__voter--voted' : ''}`}
                color={complete ? BADGE_COLOR.success : BADGE_COLOR.neutral}
              >
                {complete && <Icon name={ICON_NAME.check} />}
                {p.id === session.facilitatorId && <Icon name={ICON_NAME.crown} />}
                <span aria-hidden="true">{`${p.name} ${n}/${total}`}</span>
                <span className="visually-hidden">{t.collecting.perPerson(p.name, n, total)}</span>
              </Badge>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default CollectingProgress;

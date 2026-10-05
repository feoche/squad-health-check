import { Badge, BADGE_COLOR, Card, Icon, ICON_NAME, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState } from '../../types';
import { t } from '../../lib/i18n';
import { localizeCategory } from '../../lib/localizeCategory';
import VoteProgress from '../VoteProgress';

/** Who has voted in the current round — names only, never how they voted. */
function LiveRound({ session }: { session: ClientSessionState }) {
  const { categories, currentCategoryIndex: index } = session;
  const voted = new Set(session.voterIds);

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.label}>{t.categoryOf(index + 1, categories.length)}</Text>
      <Text preset={TEXT_PRESET.heading3}>{localizeCategory(categories[index]).title}</Text>
      <VoteProgress voteCount={session.voteCount} totalVoters={session.totalVoters} />
      <div className="inline wrap">
        {session.eligibleVoters.map((p) => {
          const hasVoted = voted.has(p.id);
          return (
            <Badge key={p.id} color={hasVoted ? BADGE_COLOR.success : BADGE_COLOR.neutral}>
              {hasVoted && <Icon name={ICON_NAME.check} />}
              {p.name}
              <span className="visually-hidden">
                {' — '}
                {hasVoted ? t.facilitator.voted : t.facilitator.waiting}
              </span>
            </Badge>
          );
        })}
      </div>
    </Card>
  );
}

export default LiveRound;

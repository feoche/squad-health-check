import { ReactNode } from 'react';
import { Card, Text, TEXT_PRESET } from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../../types';
import { t } from '../../lib/i18n';
import { localizeCategory } from '../../lib/localizeCategory';
import VoteSubmitted from '../VoteSubmitted';
import VotingPanel from '../VotingPanel';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  /** The round's results, shown in the same card */
  children?: ReactNode;
}

/** The round's category, with the facilitator's own vote form while they take part in the vote, then its results. */
function CurrentCategory({ session, onSubmitVote, children }: Props) {
  const { categories, currentCategoryIndex: index } = session;
  const voting = session.phase === 'voting' && session.facilitatorVotes;

  return (
    <Card className="card-body">
      <Text preset={TEXT_PRESET.heading3}>
        {localizeCategory(categories[index]).title}{' '}
        <span className="category-position">
          ({t.categoryPosition(index + 1, categories.length)})
        </span>
      </Text>
      {voting &&
        (session.hasVoted ? (
          <VoteSubmitted />
        ) : (
          <VotingPanel key={index} category={categories[index]} onSubmitVote={onSubmitVote} />
        ))}
      {children}
    </Card>
  );
}

export default CurrentCategory;

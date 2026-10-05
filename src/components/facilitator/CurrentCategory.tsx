import { ReactNode, useState } from 'react';
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
  /* Tied to the round, so moving on to the next category ends the edit */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const isEditing = session.hasVoted && session.myVote !== null && editingIndex === index;

  return (
    <Card className="card-body current-category">
      <Text preset={TEXT_PRESET.heading3} className="current-category__title">
        {localizeCategory(categories[index]).title}{' '}
        <span className="current-category__position">
          ({t.categoryPosition(index + 1, categories.length)})
        </span>
      </Text>
      {voting &&
        (session.hasVoted && !isEditing ? (
          <VoteSubmitted onEdit={session.myVote ? () => setEditingIndex(index) : undefined} />
        ) : (
          <VotingPanel
            key={`${index}-${isEditing}`}
            category={categories[index]}
            initialVote={isEditing ? session.myVote : null}
            onCancel={isEditing ? () => setEditingIndex(null) : undefined}
            onSubmitVote={(color, trend) => {
              setEditingIndex(null);
              onSubmitVote(color, trend);
            }}
          />
        ))}
      {children}
    </Card>
  );
}

export default CurrentCategory;

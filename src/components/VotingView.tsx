import {
  Badge,
  BADGE_COLOR,
  Card,
  CARD_COLOR,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import VotingPanel from './VotingPanel';
import ResultsGrid from './ResultsGrid';
import OpenNotesButton from './OpenNotesButton';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  onRevealVotes: () => void;
  onNextCategory: () => void;
  onEndSession: () => void;
}

function VotingView({
  session,
  onSubmitVote,
  onRevealVotes,
  onNextCategory,
  onEndSession,
}: Props) {
  const category = session.categories[session.currentCategoryIndex];

  return (
    <div className="page">
      {/* Progress bar */}
      <div className="session-header">
        <Text preset={TEXT_PRESET.label}>
          Category {session.currentCategoryIndex + 1} of{' '}
          {session.categories.length}
        </Text>
        <ProgressBar
          className="grow"
          value={session.currentCategoryIndex + 1}
          max={session.categories.length}
          aria-label="Session progress"
        />
        <Badge color={BADGE_COLOR.neutral}>Code: {session.code}</Badge>
        {session.isFacilitator && <OpenNotesButton code={session.code} />}
      </div>

      {/* Category description card */}
      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading2}>{category.name}</Text>
        {category.nameFr && (
          <Text preset={TEXT_PRESET.caption}>{category.nameFr}</Text>
        )}
        <div className="grid-2">
          <Card className="card-body card-compact" color={CARD_COLOR.success}>
            <Badge className="self-start" color={BADGE_COLOR.success}>Green</Badge>
            <Text preset={TEXT_PRESET.paragraph}>
              {category.positiveDescription}
            </Text>
          </Card>
          <Card className="card-body card-compact" color={CARD_COLOR.critical}>
            <Badge className="self-start" color={BADGE_COLOR.critical}>Red</Badge>
            <Text preset={TEXT_PRESET.paragraph}>
              {category.negativeDescription}
            </Text>
          </Card>
        </div>
      </Card>

      {/* Voting or Results */}
      {session.phase === 'voting' && (
        <VotingPanel
          hasVoted={session.hasVoted}
          voteCount={session.voteCount}
          totalParticipants={session.totalParticipants}
          onSubmitVote={onSubmitVote}
          isFacilitator={session.isFacilitator}
          onRevealVotes={onRevealVotes}
        />
      )}

      {session.phase === 'revealed' && session.currentResults && (
        <ResultsGrid
          votes={session.currentResults}
          isFacilitator={session.isFacilitator}
          isLastCategory={
            session.currentCategoryIndex === session.categories.length - 1
          }
          onNextCategory={onNextCategory}
          onEndSession={onEndSession}
        />
      )}
    </div>
  );
}

export default VotingView;

import {
  Badge,
  BADGE_COLOR,
  Card,
  CARD_COLOR,
  type CardColor,
  ProgressBar,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import { COLOR_OPTIONS, colorDescription } from './voteOptions';
import VotingPanel from './VotingPanel';
import ResultsGrid from './ResultsGrid';
import OpenNotesButton from './OpenNotesButton';

const CARD_COLORS: Record<VoteColor, CardColor> = {
  green: CARD_COLOR.success,
  orange: CARD_COLOR.warning,
  red: CARD_COLOR.critical,
};

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
  const isPicking = session.phase === 'voting' && !session.hasVoted;

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

      {/* Category card */}
      <Card className="card-body">
        <Text preset={TEXT_PRESET.heading2}>{category.name}</Text>
        {category.nameFr && (
          <Text preset={TEXT_PRESET.caption}>{category.nameFr}</Text>
        )}
        {/* While picking, the descriptions live in the vote tiles instead */}
        {!isPicking && (
          <div className="grid-3">
            {COLOR_OPTIONS.map((option) => (
              <Card
                key={option.value}
                className="card-body card-compact"
                color={CARD_COLORS[option.value]}
              >
                <Badge className="self-start" color={option.badge}>{option.label}</Badge>
                <Text preset={TEXT_PRESET.paragraph}>
                  {colorDescription(category, option)}
                </Text>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Voting or Results */}
      {session.phase === 'voting' && (
        <VotingPanel
          category={category}
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

import { ClientSessionState, VoteColor, VoteTrend } from '../types';
import VotingPanel from './VotingPanel';
import ResultsGrid from './ResultsGrid';

interface Props {
  session: ClientSessionState;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  onRevealVotes: () => void;
  onNextCategory: () => void;
  onUpdateNotes: (categoryIndex: number, notes: string) => void;
  onEndSession: () => void;
}

function VotingView({
  session,
  onSubmitVote,
  onRevealVotes,
  onNextCategory,
  onUpdateNotes,
  onEndSession,
}: Props) {
  const category = session.categories[session.currentCategoryIndex];

  return (
    <div className="session-view">
      {/* Progress bar */}
      <div className="session-header">
        <div className="session-progress">
          Category {session.currentCategoryIndex + 1} of{' '}
          {session.categories.length}
        </div>
        <div className="session-progress-bar">
          <div
            className="session-progress-fill"
            style={{
              width: `${((session.currentCategoryIndex + 1) / session.categories.length) * 100}%`,
            }}
          />
        </div>
        <div className="session-code-badge">Code: {session.code}</div>
      </div>

      {/* Category description card */}
      <div className="category-card card">
        <h2>{category.name}</h2>
        {category.nameFr && (
          <p className="category-fr-name">{category.nameFr}</p>
        )}
        <div className="category-descriptions">
          <div className="description positive">
            <span className="description-icon">🟢</span>
            <p>{category.positiveDescription}</p>
          </div>
          <div className="description negative">
            <span className="description-icon">🔴</span>
            <p>{category.negativeDescription}</p>
          </div>
        </div>
      </div>

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
          notes={session.notes[session.currentCategoryIndex] || ''}
          onUpdateNotes={(notes) =>
            onUpdateNotes(session.currentCategoryIndex, notes)
          }
        />
      )}
    </div>
  );
}

export default VotingView;


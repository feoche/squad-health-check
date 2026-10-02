import { useState } from 'react';
import { VoteColor, VoteTrend } from '../types';

interface Props {
  hasVoted: boolean;
  voteCount: number;
  totalParticipants: number;
  onSubmitVote: (color: VoteColor, trend: VoteTrend) => void;
  isFacilitator: boolean;
  onRevealVotes: () => void;
}

function VotingPanel({
  hasVoted,
  voteCount,
  totalParticipants,
  onSubmitVote,
  isFacilitator,
  onRevealVotes,
}: Props) {
  const [selectedColor, setSelectedColor] = useState<VoteColor | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<VoteTrend | null>(null);

  const handleSubmit = () => {
    if (selectedColor && selectedTrend) {
      onSubmitVote(selectedColor, selectedTrend);
    }
  };

  if (hasVoted) {
    return (
      <div className="voting-panel voted">
        <div className="vote-submitted">
          <span className="check-mark">✓</span>
          <h3>Vote submitted!</h3>
          <p className="vote-progress">
            {voteCount} / {totalParticipants} votes received
          </p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(voteCount / totalParticipants) * 100}%` }}
            />
          </div>
          {isFacilitator && voteCount < totalParticipants && (
            <button
              className="btn btn-secondary"
              onClick={onRevealVotes}
              style={{ marginTop: '1rem' }}
            >
              Reveal Votes Now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="voting-panel">
      <div className="vote-section">
        <h3>Health Color</h3>
        <div className="color-options">
          {(['green', 'orange', 'red'] as VoteColor[]).map((color) => (
            <button
              key={color}
              className={`color-btn ${color} ${selectedColor === color ? 'selected' : ''}`}
              onClick={() => setSelectedColor(color)}
            >
              <span className="color-circle" />
              <span className="color-label">
                {color === 'green' ? 'Green' : color === 'orange' ? 'Orange' : 'Red'}
              </span>
              <span className="color-desc">
                {color === 'green'
                  ? 'Happy with it'
                  : color === 'orange'
                    ? 'Issues to handle'
                    : 'Needs improvement'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="vote-section">
        <h3>Trend</h3>
        <div className="trend-options">
          {(
            [
              { value: 'up', icon: '↗', label: 'Improving' },
              { value: 'stable', icon: '→', label: 'Stable' },
              { value: 'down', icon: '↘', label: 'Getting worse' },
            ] as { value: VoteTrend; icon: string; label: string }[]
          ).map(({ value, icon, label }) => (
            <button
              key={value}
              className={`trend-btn ${value} ${selectedTrend === value ? 'selected' : ''}`}
              onClick={() => setSelectedTrend(value)}
            >
              <span className="trend-icon">{icon}</span>
              <span className="trend-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn btn-primary btn-large submit-vote-btn"
        onClick={handleSubmit}
        disabled={!selectedColor || !selectedTrend}
      >
        Submit Vote
      </button>

      <p className="vote-progress-small">
        {voteCount} / {totalParticipants} votes received
      </p>

      {isFacilitator && voteCount > 0 && (
        <button className="btn btn-secondary" onClick={onRevealVotes}>
          Reveal Votes Now ({voteCount}/{totalParticipants})
        </button>
      )}
    </div>
  );
}

export default VotingPanel;


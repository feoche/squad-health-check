import { ClientSessionState } from '../types';
import { useNetworkOrigin } from '../hooks/useNetworkOrigin';

interface Props {
  session: ClientSessionState;
  onStartVoting: () => void;
}

function Lobby({ session, onStartVoting }: Props) {
  const networkOrigin = useNetworkOrigin();
  const shareUrl = `${networkOrigin}/session/${session.code}`;
  const storedRaw = sessionStorage.getItem('shc-session');
  const myId: string | null = storedRaw
    ? JSON.parse(storedRaw).participantId
    : null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* fallback */
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  return (
    <div className="lobby">
      <div className="card lobby-card">
        <h2>🏥 Session Lobby</h2>

        <div className="lobby-code">
          <span className="label">Session Code</span>
          <span className="code">{session.code}</span>
        </div>

        <div className="lobby-share">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="input share-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button className="btn btn-secondary" onClick={handleCopyLink}>
            📋 Copy Link
          </button>
        </div>

        <div className="participants-section">
          <h3>Participants ({session.participants.length})</h3>
          <div className="participants-list">
            {session.participants.map((p) => (
              <div key={p.id} className="participant-badge">
                {p.name}
                {p.id === myId && <span className="you-tag"> (You)</span>}
                {session.isFacilitator && p.id === session.participants[0]?.id && p.id !== myId && (
                  <span className="facilitator-tag"> 👑</span>
                )}
                {p.id === myId && session.isFacilitator && (
                  <span className="facilitator-tag"> 👑</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-info">
          <p>📋 {session.categories.length} categories to review</p>
        </div>

        {session.isFacilitator ? (
          <button
            className="btn btn-primary btn-large"
            onClick={onStartVoting}
            disabled={session.participants.length < 1}
          >
            Start Voting ({session.participants.length} participant
            {session.participants.length !== 1 ? 's' : ''})
          </button>
        ) : (
          <div className="waiting-message">
            <div className="spinner" />
            <p>Waiting for the facilitator to start the session…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lobby;


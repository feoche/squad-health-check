import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [sessionCode, setSessionCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.trim()) {
      navigate(`/session/${sessionCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="home-page">
      <div className="hero">
        <h2>Welcome to Squad Health Check</h2>
        <p>
          Run anonymous health check sessions with your team. Vote on
          categories, discuss results, and track your squad's well-being.
        </p>
      </div>

      <div className="home-actions">
        <div className="card">
          <h3>🎯 Create a New Session</h3>
          <p>Set up categories and invite your team</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/create')}
          >
            Create Session
          </button>
        </div>

        <div className="card">
          <h3>🔗 Join a Session</h3>
          <p>Enter the session code shared by your facilitator</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Session code (e.g. ABC123)"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input"
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={!sessionCode.trim()}
            >
              Join Session
            </button>
          </form>
        </div>
      </div>

      <div className="card instructions-card">
        <h3>📋 How it works</h3>
        <ol>
          <li>The facilitator creates a session and shares the code / link</li>
          <li>Team members join using their name</li>
          <li>
            For each category, everyone votes a <strong>color</strong>{' '}
            (🟢 🟠 🔴) and a <strong>trend</strong> (↗ → ↘)
          </li>
          <li>Votes are anonymous — results show only aggregate counts</li>
          <li>After all votes are in, discuss as a team</li>
          <li>Download a recap (Markdown + PDF) at the end</li>
        </ol>
      </div>
    </div>
  );
}

export default Home;


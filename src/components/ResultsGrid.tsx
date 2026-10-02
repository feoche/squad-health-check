import { Vote } from '../types';

interface Props {
  votes: Vote[];
  isFacilitator: boolean;
  isLastCategory: boolean;
  onNextCategory: () => void;
  onEndSession: () => void;
  notes: string;
  onUpdateNotes: (notes: string) => void;
}

function ResultsGrid({
  votes,
  isFacilitator,
  isLastCategory,
  onNextCategory,
  onEndSession,
  notes,
  onUpdateNotes,
}: Props) {
  const total = votes.length;
  const colorCounts = {
    green: votes.filter((v) => v.color === 'green').length,
    orange: votes.filter((v) => v.color === 'orange').length,
    red: votes.filter((v) => v.color === 'red').length,
  };
  const trendCounts = {
    up: votes.filter((v) => v.trend === 'up').length,
    stable: votes.filter((v) => v.trend === 'stable').length,
    down: votes.filter((v) => v.trend === 'down').length,
  };

  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="results-grid">
      <h3>Results ({total} votes)</h3>

      <div className="results-section">
        <h4>Health Color</h4>
        <div className="result-bars">
          {([
            { key: 'green', label: '🟢 Green', count: colorCounts.green, cls: 'green' },
            { key: 'orange', label: '🟠 Orange', count: colorCounts.orange, cls: 'orange' },
            { key: 'red', label: '🔴 Red', count: colorCounts.red, cls: 'red' },
          ] as const).map(({ key, label, count, cls }) => (
            <div className="result-bar-row" key={key}>
              <span className="result-label">{label}</span>
              <div className="result-bar">
                <div
                  className={`result-bar-fill ${cls}`}
                  style={{ width: `${pct(count)}%` }}
                />
              </div>
              <span className="result-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="results-section">
        <h4>Trend</h4>
        <div className="result-bars">
          {([
            { key: 'up', label: '↗ Improving', count: trendCounts.up, cls: 'trend-up' },
            { key: 'stable', label: '→ Stable', count: trendCounts.stable, cls: 'trend-stable' },
            { key: 'down', label: '↘ Worsening', count: trendCounts.down, cls: 'trend-down' },
          ] as const).map(({ key, label, count, cls }) => (
            <div className="result-bar-row" key={key}>
              <span className="result-label">{label}</span>
              <div className="result-bar">
                <div
                  className={`result-bar-fill ${cls}`}
                  style={{ width: `${pct(count)}%` }}
                />
              </div>
              <span className="result-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="results-section notes-section">
        <h4>Discussion Notes</h4>
        {isFacilitator ? (
          <textarea
            className="input textarea notes-textarea"
            placeholder="Write down key discussion points…"
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            rows={4}
          />
        ) : (
          <div className="notes-display">
            {notes || <em>No notes yet…</em>}
          </div>
        )}
      </div>

      {isFacilitator && (
        <div className="results-actions">
          {!isLastCategory ? (
            <button className="btn btn-primary btn-large" onClick={onNextCategory}>
              Next Category →
            </button>
          ) : (
            <button className="btn btn-primary btn-large" onClick={onEndSession}>
              Finish Session ✓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultsGrid;


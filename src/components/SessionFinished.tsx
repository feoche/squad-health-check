import { ClientSessionState, Vote } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  session: ClientSessionState;
}

/* ─── Counting helpers ─── */

function countColors(votes: Vote[]) {
  return {
    green: votes.filter((v) => v.color === 'green').length,
    orange: votes.filter((v) => v.color === 'orange').length,
    red: votes.filter((v) => v.color === 'red').length,
  };
}

function countTrends(votes: Vote[]) {
  return {
    up: votes.filter((v) => v.trend === 'up').length,
    stable: votes.filter((v) => v.trend === 'stable').length,
    down: votes.filter((v) => v.trend === 'down').length,
  };
}

/* ─── Dominant helpers ─── */

function dominantColor(votes: Vote[]): string {
  const c = countColors(votes);
  if (c.green >= c.orange && c.green >= c.red) return '🟢';
  if (c.orange >= c.red) return '🟠';
  return '🔴';
}

function dominantTrend(votes: Vote[]): string {
  const t = countTrends(votes);
  if (t.up >= t.stable && t.up >= t.down) return '↗';
  if (t.stable >= t.down) return '→';
  return '↘';
}

/* ─── Markdown generation ─── */

function generateMarkdown(session: ClientSessionState): string {
  const date = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# Squad Health Check — ${date}\n\n`;
  md += `**Session Code:** ${session.code}  \n`;
  md += `**Participants:** ${session.participants.length}\n\n`;
  md += `## Results Summary\n\n`;
  md += `| # | Category | Health | Trend | 🟢 | 🟠 | 🔴 | ↗ | → | ↘ |\n`;
  md += `|---|----------|--------|-------|-----|-----|-----|-----|-----|-----|\n`;

  for (const result of session.allResults) {
    const cat = session.categories[result.categoryIndex];
    const cc = countColors(result.votes);
    const tc = countTrends(result.votes);
    const dc = dominantColor(result.votes);
    const dt = dominantTrend(result.votes);
    md += `| ${result.categoryIndex + 1} | ${cat.name} | ${dc} | ${dt} | ${cc.green} | ${cc.orange} | ${cc.red} | ${tc.up} | ${tc.stable} | ${tc.down} |\n`;
  }

  md += `\n## Detailed Results\n\n`;

  for (const result of session.allResults) {
    const cat = session.categories[result.categoryIndex];
    const cc = countColors(result.votes);
    const tc = countTrends(result.votes);

    md += `### ${result.categoryIndex + 1}. ${cat.name}`;
    if (cat.nameFr) md += ` (${cat.nameFr})`;
    md += `\n\n`;
    md += `- 🟢 **Green:** ${cat.positiveDescription}\n`;
    md += `- 🔴 **Red:** ${cat.negativeDescription}\n\n`;
    md += `**Votes (${result.votes.length}):** 🟢 ${cc.green} | 🟠 ${cc.orange} | 🔴 ${cc.red}  \n`;
    md += `**Trend:** ↗ ${tc.up} | → ${tc.stable} | ↘ ${tc.down}\n\n`;

    if (result.notes) {
      md += `**Discussion Notes:**\n\n${result.notes}\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

/* ─── Download helpers ─── */

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(session: ClientSessionState) {
  const md = generateMarkdown(session);
  downloadFile(md, `squad-health-check-${session.code}.md`, 'text/markdown');
}

function downloadPDF(session: ClientSessionState) {
  const date = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const doc = new jsPDF();

  /* Title */
  doc.setFontSize(22);
  doc.setTextColor(74, 144, 217);
  doc.text('Squad Health Check', 14, 22);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(date, 14, 30);
  doc.setFontSize(10);
  doc.text(
    `Session: ${session.code}  |  Participants: ${session.participants.length}`,
    14,
    36,
  );

  /* Summary table */
  const tableBody = session.allResults.map((r) => {
    const cat = session.categories[r.categoryIndex];
    const cc = countColors(r.votes);
    const tc = countTrends(r.votes);
    return [
      cat.name,
      String(cc.green),
      String(cc.orange),
      String(cc.red),
      String(tc.up),
      String(tc.stable),
      String(tc.down),
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['Category', 'Green', 'Orange', 'Red', 'Up', 'Stable', 'Down']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [74, 144, 217], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
    },
  });

  /* Notes section */
  let y = (doc as any).lastAutoTable.finalY + 12;

  for (const result of session.allResults) {
    if (!result.notes) continue;
    const cat = session.categories[result.categoryIndex];

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cat.name} — Notes:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(result.notes, 180);
    doc.text(lines, 14, y + 6);
    y += 6 + lines.length * 4.5 + 10;
  }

  doc.save(`squad-health-check-${session.code}.pdf`);
}

/* ─── Component ─── */

function SessionFinished({ session }: Props) {
  return (
    <div className="session-finished">
      <div className="finished-header">
        <h2>🎉 Session Complete!</h2>
        <p>
          Here&apos;s the summary of all results from the health check.
        </p>
      </div>

      <div className="recap-table-container card">
        <table className="recap-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>🟢</th>
              <th>🟠</th>
              <th>🔴</th>
              <th>↗</th>
              <th>→</th>
              <th>↘</th>
            </tr>
          </thead>
          <tbody>
            {session.allResults.map((result) => {
              const cat = session.categories[result.categoryIndex];
              const cc = countColors(result.votes);
              const tc = countTrends(result.votes);
              return (
                <tr key={result.categoryIndex}>
                  <td className="row-num">{result.categoryIndex + 1}</td>
                  <td className="cat-name">{cat.name}</td>
                  <td className="count green">{cc.green}</td>
                  <td className="count orange">{cc.orange}</td>
                  <td className="count red">{cc.red}</td>
                  <td className="count trend-up">{tc.up}</td>
                  <td className="count trend-stable">{tc.stable}</td>
                  <td className="count trend-down">{tc.down}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {session.allResults.some((r) => r.notes) && (
        <div className="recap-notes card">
          <h3>📝 Discussion Notes</h3>
          {session.allResults
            .filter((r) => r.notes)
            .map((result) => (
              <div key={result.categoryIndex} className="recap-note-item">
                <h4>{session.categories[result.categoryIndex].name}</h4>
                <p>{result.notes}</p>
              </div>
            ))}
        </div>
      )}

      <div className="download-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={() => downloadMarkdown(session)}
        >
          📄 Download Markdown
        </button>
        <button
          className="btn btn-secondary btn-large"
          onClick={() => downloadPDF(session)}
        >
          📑 Download PDF
        </button>
      </div>
    </div>
  );
}

export default SessionFinished;


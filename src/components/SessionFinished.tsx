import {
  Badge,
  Button,
  BUTTON_VARIANT,
  Card,
  Icon,
  ICON_NAME,
  Table,
  Text,
  TEXT_PRESET,
} from '@ovhcloud/ods-react';
import { ClientSessionState, Vote } from '../types';
import { COLOR_OPTIONS, TREND_OPTIONS } from './voteOptions';
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
    <div className="page">
      <div className="stack stack-center">
        <Text preset={TEXT_PRESET.heading2}>Session Complete!</Text>
        <Text preset={TEXT_PRESET.paragraph}>
          Here&apos;s the summary of all results from the health check.
        </Text>
      </div>

      <Card className="card-body table-scroll">
        <Table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Category</th>
              {COLOR_OPTIONS.map(({ value, label, badge }) => (
                <th scope="col" key={value}>
                  <Badge color={badge}>{label}</Badge>
                </th>
              ))}
              {TREND_OPTIONS.map(({ value, label, icon }) => (
                <th scope="col" key={value}>
                  <Icon name={icon} aria-label={label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.allResults.map((result) => {
              const cat = session.categories[result.categoryIndex];
              const cc = countColors(result.votes);
              const tc = countTrends(result.votes);
              return (
                <tr key={result.categoryIndex}>
                  <td>{result.categoryIndex + 1}</td>
                  <th scope="row">{cat.name}</th>
                  <td>{cc.green}</td>
                  <td>{cc.orange}</td>
                  <td>{cc.red}</td>
                  <td>{tc.up}</td>
                  <td>{tc.stable}</td>
                  <td>{tc.down}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {session.allResults.some((r) => r.notes) && (
        <Card className="card-body">
          <Text preset={TEXT_PRESET.heading3}>Discussion Notes</Text>
          {session.allResults
            .filter((r) => r.notes)
            .map((result) => (
              <div key={result.categoryIndex} className="stack">
                <Text preset={TEXT_PRESET.heading5}>
                  {session.categories[result.categoryIndex].name}
                </Text>
                <Text preset={TEXT_PRESET.paragraph} className="pre-wrap">
                  {result.notes}
                </Text>
              </div>
            ))}
        </Card>
      )}

      <div className="actions">
        <Button onClick={() => downloadMarkdown(session)}>
          <Icon name={ICON_NAME.download} />
          Download Markdown
        </Button>
        <Button
          variant={BUTTON_VARIANT.outline}
          onClick={() => downloadPDF(session)}
        >
          <Icon name={ICON_NAME.download} />
          Download PDF
        </Button>
      </div>
    </div>
  );
}

export default SessionFinished;


import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';
import { LANG, Lang, messagesFor, t } from './i18n';
import { localizeCategory } from './localizeCategory';
import { formatScore, medianScore, scoreCell } from './voteScore';

/* ─── Counting helpers ─── */

export function countColors(votes: Vote[]): Record<VoteColor, number> {
  return {
    green: votes.filter((v) => v.color === 'green').length,
    orange: votes.filter((v) => v.color === 'orange').length,
    red: votes.filter((v) => v.color === 'red').length,
  };
}

export function countTrends(votes: Vote[]): Record<VoteTrend, number> {
  return {
    up: votes.filter((v) => v.trend === 'up').length,
    stable: votes.filter((v) => v.trend === 'stable').length,
    down: votes.filter((v) => v.trend === 'down').length,
  };
}

const COLOR_EMOJI: Record<VoteColor, string> = { green: '🟢', orange: '🟠', red: '🔴' };
const TREND_ARROW: Record<VoteTrend, string> = { up: '↗', stable: '→', down: '↘' };

/** Median cell as emoji and arrow, e.g. "🟠 ↗" */
function medianCell(score: number): string {
  const { color, trend } = scoreCell(score);
  return `${COLOR_EMOJI[color]} ${TREND_ARROW[trend]}`;
}

const formatDate = (date: Date, lang: Lang = LANG) =>
  date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

/* ─── Markdown generation ─── */

export function generateMarkdown(
  session: ClientSessionState,
  date = new Date(),
  lang: Lang = LANG,
): string {
  const m = messagesFor(lang);
  const r = m.report;
  let md = `# Squad Health Check — ${formatDate(date, lang)}\n\n`;
  md += `**${r.sessionCode}:** ${session.code}  \n`;
  md += `**${r.participants}:** ${session.participants.length}\n\n`;
  md += `## ${r.summary}\n\n`;
  md += `| # | ${r.category} | ${r.median} | ${r.score} | 🟢 | 🟠 | 🔴 | ↗ | → | ↘ |\n`;
  md += `|---|----------|--------|-------|-----|-----|-----|-----|-----|-----|\n`;

  for (const result of session.allResults) {
    const cat = localizeCategory(session.categories[result.categoryIndex], lang);
    const cc = countColors(result.votes);
    const tc = countTrends(result.votes);
    const score = medianScore(result.votes);
    md += `| ${result.categoryIndex + 1} | ${cat.title} | ${score === null ? '—' : medianCell(score)} | ${score === null ? '—' : formatScore(score, lang)} | ${cc.green} | ${cc.orange} | ${cc.red} | ${tc.up} | ${tc.stable} | ${tc.down} |\n`;
  }

  md += `\n## ${r.details}\n\n`;

  for (const result of session.allResults) {
    const cat = localizeCategory(session.categories[result.categoryIndex], lang);
    const cc = countColors(result.votes);
    const tc = countTrends(result.votes);

    md += `### ${result.categoryIndex + 1}. ${cat.title}`;
    if (cat.subtitle) md += ` (${cat.subtitle})`;
    md += `\n\n`;
    md += `- 🟢 **${m.colors.green}:** ${cat.positiveDescription}\n`;
    if (cat.mixedDescription) md += `- 🟠 **${m.colors.orange}:** ${cat.mixedDescription}\n`;
    md += `- 🔴 **${m.colors.red}:** ${cat.negativeDescription}\n\n`;
    md += `**${r.votes} (${result.votes.length}):** 🟢 ${cc.green} | 🟠 ${cc.orange} | 🔴 ${cc.red}  \n`;
    md += `**${r.trend}:** ↗ ${tc.up} | → ${tc.stable} | ↘ ${tc.down}\n\n`;

    const score = medianScore(result.votes);
    if (score !== null) md += `**${r.median}:** ${medianCell(score)} (${formatScore(score, lang)})\n\n`;

    if (result.notes) {
      md += `**${r.discussion}:**\n\n${result.notes}\n\n`;
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

export function downloadMarkdown(session: ClientSessionState): void {
  downloadFile(generateMarkdown(session), `squad-health-check-${session.code}.md`, 'text/markdown');
}

/** Median in words, e.g. "6/9 – Orange, improving": jsPDF's built-in fonts have no arrows */
function pdfMedian(score: number): string {
  const { color, trend } = scoreCell(score);
  return `${formatScore(score)} – ${t.colors[color]}, ${t.trends[trend].toLowerCase()}`;
}

/** jsPDF is loaded on demand: only the facilitator ever exports. */
export async function downloadPDF(session: ClientSessionState): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();

  /* Title */
  doc.setFontSize(22);
  doc.setTextColor(74, 144, 217);
  doc.text('Squad Health Check', 14, 22);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(formatDate(new Date()), 14, 30);
  doc.setFontSize(10);
  doc.text(
    `${t.report.session}: ${session.code}  |  ${t.report.participants}: ${session.participants.length}`,
    14,
    36,
  );

  /* Summary table */
  const tableBody = session.allResults.map((r) => {
    const cc = countColors(r.votes);
    const tc = countTrends(r.votes);
    const score = medianScore(r.votes);
    return [
      localizeCategory(session.categories[r.categoryIndex]).title,
      score === null ? '—' : pdfMedian(score),
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
    head: [[
      t.report.category,
      t.report.median,
      t.colors.green,
      t.colors.orange,
      t.colors.red,
      t.report.pdfTrends.up,
      t.report.pdfTrends.stable,
      t.report.pdfTrends.down,
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [74, 144, 217], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
    },
  });

  /* Notes */
  let y = (doc as any).lastAutoTable.finalY + 12;

  for (const result of session.allResults) {
    if (!result.notes) continue;
    const cat = localizeCategory(session.categories[result.categoryIndex]);

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(cat.title, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(result.notes, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 10;
  }

  doc.save(`squad-health-check-${session.code}.pdf`);
}

import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';
import { LANG, Lang, messagesFor } from './i18n';
import { localizeCategory } from './localizeCategory';
import { toSessionExport } from './sessionHistory';
import { MAX_SCORE, MIN_SCORE, formatScore, medianScore, rangeVotes, scoreCell, scoreCounts, trendCounts } from './voteScore';

/* The exports hold what the facilitator recap shows: per category, its votes, median and note. */

const COLOR_EMOJI: Record<VoteColor, string> = { green: '🟢', orange: '🟠', red: '🔴' };
const TREND_ARROW: Record<VoteTrend, string> = { up: '↗', stable: '→', down: '↘' };

/** Median as emoji and arrow, e.g. "🟠 ↗"; a dash without votes */
function medianCell(votes: Vote[]): string {
  const score = medianScore(votes);
  if (score === null) return '—';
  const { color, trend } = scoreCell(score);
  return `${COLOR_EMOJI[color]} ${TREND_ARROW[trend]}`;
}

export const formatDate = (date: Date, lang: Lang = LANG) =>
  date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

/** e.g. "2026/10/06" */
export const numericDate = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, '0')).join('/');

/** Each result with its category number and title, in recap order */
export const rows = (session: ClientSessionState, lang: Lang) =>
  session.allResults.map((result) => ({
    n: result.categoryIndex + 1,
    title: localizeCategory(session.categories[result.categoryIndex], lang).title,
    result,
  }));

/** "7 ×2 · 9 ×1": each score that got votes, lowest first */
export function scoreSummary(votes: Vote[]): string {
  return scoreCounts(rangeVotes(votes))
    .flatMap((n, i) => (n ? [`${MIN_SCORE + i} ×${n}`] : []))
    .join(' · ');
}

/** "Improvement 2 · Stability 1 · Decline 0", improvement first */
export function trendSummary(votes: Vote[], labels: Record<VoteTrend, string>): string {
  const counts = trendCounts(votes);
  return (['up', 'stable', 'down'] as VoteTrend[]).map((trend) => `${labels[trend]} ${counts[trend]}`).join(' · ');
}

/** "7/9" for a Range median; a dash without votes */
export const scoreOutOf = (votes: Vote[]): string => {
  const score = medianScore(votes);
  return score === null ? '—' : `${formatScore(score)}/${MAX_SCORE}`;
};

/* ─── Markdown generation ─── */

export function generateMarkdown(
  session: ClientSessionState,
  date = new Date(),
  lang: Lang = LANG,
): string {
  const m = messagesFor(lang);
  const r = m.report;
  let md = `# Squad Health Check — ${numericDate(date)}\n\n`;
  md += `Date: ${formatDate(date, lang)}\n${r.voters(session.totalVoters)}\n\n`;

  md += `## ${r.notes}\n\n`;
  for (const { n, title, result } of rows(session, lang)) {
    md += `### ${n}. ${title} (${m.votes(result.votes.length)})\n`;
    if (session.voteMode === 'range') {
      md += `${r.medianOf(scoreOutOf(result.votes))}\n`;
      if (result.votes.length) {
        const arrows = trendCounts(result.votes);
        md += `${r.scoresLine(scoreSummary(result.votes))}\n`;
        md += `${r.trendsLine(`↗ ${arrows.up} · → ${arrows.stable} · ↘ ${arrows.down}`)}\n`;
      }
      md += '\n';
    } else {
      md += `${r.medianOf(medianCell(result.votes))}\n\n`;
    }
    if (result.notes) md += `${result.notes}\n\n`;
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

/** The recap as JSON, imported in the next session to compare with it */
export function downloadJSON(session: ClientSessionState): void {
  downloadFile(
    JSON.stringify(toSessionExport(session), null, 2),
    `squad-health-check-${session.code}.json`,
    'application/json',
  );
}

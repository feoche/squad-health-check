import type { jsPDF } from 'jspdf';
import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';
import { formatDate, numericDate, rows } from './exportReport';
import { LANG, Lang, messagesFor } from './i18n';
import { medianScore, scoreCell } from './voteScore';

/* The PDF holds what the Markdown export holds, laid out like the app.
 * Colours are the ODS default theme's token values: jsPDF cannot read CSS variables.
 * ODS's Source Sans Pro only ships as woff2, which jsPDF cannot embed, so text uses
 * Helvetica, close to the theme's Arial fallback. */

type Rgb = [number, number, number];

const ODS = {
  /** --ods-theme-heading-text-color */
  heading: [0x00, 0x18, 0x5e],
  /** --ods-theme-text-color */
  text: [0x4d, 0x55, 0x92],
  /** --ods-theme-primary-color */
  primary: [0x00, 0x50, 0xd7],
  /** --ods-color-neutral-100: card borders */
  border: [0xe6, 0xe6, 0xe6],
  /** --ods-color-neutral-600: captions */
  caption: [0x66, 0x66, 0x66],
} satisfies Record<string, Rgb>;

/** ODS badge colours: --ods-color-{status}-100 background, -900 text */
const BADGE: Record<VoteColor, { background: Rgb; text: Rgb }> = {
  green: { background: [0xd2, 0xf2, 0xc2], text: [0x11, 0x33, 0x00] },
  orange: { background: [0xfe, 0xea, 0x86], text: [0x4d, 0x2a, 0x00] },
  red: { background: [0xff, 0xcc, 0xd9], text: [0x4d, 0x00, 0x0d] },
};

/** A4 portrait, in mm */
const PAGE = { width: 210, height: 297, margin: 16, footer: 12 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
/** --ods-theme-border-radius (8px) and the badge's half of it, in mm */
const RADIUS = 2;
const BADGE_RADIUS = 1;
const CARD_PADDING = 5;
const NOTE_LINE = 5;

/** Arrow pointing right, up-right or down-right, drawn since Helvetica has no arrow glyphs */
function drawTrendArrow(doc: jsPDF, trend: VoteTrend, x: number, y: number, size: number) {
  const angle = { up: -Math.PI / 4, stable: 0, down: Math.PI / 4 }[trend];
  const cx = x + size / 2;
  const dx = (Math.cos(angle) * size) / 2;
  const dy = (Math.sin(angle) * size) / 2;
  const tip = [cx + dx, y + dy];
  const head = size * 0.4;
  doc.setLineWidth(0.35);
  doc.line(cx - dx, y - dy, tip[0], tip[1]);
  for (const side of [-1, 1]) {
    const a = angle + Math.PI + (side * Math.PI) / 4;
    doc.line(tip[0], tip[1], tip[0] + Math.cos(a) * head, tip[1] + Math.sin(a) * head);
  }
}

/** The median as an ODS badge, e.g. [Orange · Stable →]; a dash without votes. Returns its width. */
function drawMedian(doc: jsPDF, votes: Vote[], x: number, y: number, lang: Lang): number {
  const m = messagesFor(lang);
  const score = medianScore(votes);
  doc.setFontSize(10);
  if (score === null) {
    doc.setTextColor(...ODS.caption);
    doc.text('—', x, y);
    return doc.getTextWidth('—');
  }
  const { color, trend } = scoreCell(score);
  const label = `${m.colors[color]} · ${m.trends[trend]}`;
  const arrow = 3;
  const padding = 2;
  const width = padding + doc.getTextWidth(label) + 1.5 + arrow + padding;
  const height = 6;
  doc.setFillColor(...BADGE[color].background);
  doc.roundedRect(x, y - 4.2, width, height, BADGE_RADIUS, BADGE_RADIUS, 'F');
  doc.setTextColor(...BADGE[color].text);
  doc.setDrawColor(...BADGE[color].text);
  doc.text(label, x + padding, y);
  drawTrendArrow(doc, trend, x + width - padding - arrow, y - 1.2, arrow);
  return width;
}

/** Builds the report: a heading with the date and voters, then one card per category. */
export async function buildPDF(session: ClientSessionState, date = new Date(), lang: Lang = LANG): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const m = messagesFor(lang);
  const r = m.report;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');

  const bottom = PAGE.height - PAGE.margin - PAGE.footer;
  let y = PAGE.margin;

  /* Heading */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...ODS.heading);
  doc.text(`Squad Health Check — ${numericDate(date)}`, PAGE.margin, y + 6);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...ODS.text);
  doc.text(`Date: ${formatDate(date, lang)}`, PAGE.margin, y);
  y += 6;
  doc.text(r.voters(session.totalVoters), PAGE.margin, y);
  y += 5;
  doc.setDrawColor(...ODS.primary);
  doc.setLineWidth(0.6);
  doc.line(PAGE.margin, y, PAGE.margin + CONTENT_WIDTH, y);
  y += 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...ODS.heading);
  doc.text(r.notes, PAGE.margin, y);
  y += 7;

  /* One card per category; a long note carries on in a card on the next page */
  const cardBorder = (top: number, height: number) => {
    doc.setDrawColor(...ODS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(PAGE.margin, top, CONTENT_WIDTH, height, RADIUS, RADIUS, 'S');
  };
  const textWidth = CONTENT_WIDTH - 2 * CARD_PADDING;
  const headerHeight = CARD_PADDING + 14;

  for (const { n, title, result } of rows(session, lang)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines: string[] = result.notes ? doc.splitTextToSize(result.notes.trim(), textWidth) : [];
    const notesHeight = lines.length ? 2 + lines.length * NOTE_LINE : 0;
    const fullHeight = headerHeight + notesHeight + CARD_PADDING - 1;

    // Keep the card whole when it fits on a page, and its header with at least two note lines otherwise
    const needed = Math.min(fullHeight, headerHeight + 2 + 2 * NOTE_LINE + CARD_PADDING);
    if (y + needed > bottom) {
      doc.addPage();
      y = PAGE.margin;
    }

    let top = y;
    const x = PAGE.margin + CARD_PADDING;
    y += CARD_PADDING + 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ODS.heading);
    doc.text(`${n}. ${title}`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...ODS.caption);
    doc.text(m.votes(result.votes.length), PAGE.margin + CONTENT_WIDTH - CARD_PADDING, y, { align: 'right' });

    y += 8;
    doc.setTextColor(...ODS.text);
    const label = r.medianOf('').trimEnd();
    doc.text(label, x, y);
    drawMedian(doc, result.votes, x + doc.getTextWidth(label) + 2, y, lang);
    y += 2;

    if (lines.length) {
      y += 2;
      doc.setFontSize(10);
      doc.setTextColor(...ODS.text);
      for (const line of lines) {
        if (y + NOTE_LINE > bottom) {
          cardBorder(top, y + CARD_PADDING - 1 - top);
          doc.addPage();
          top = PAGE.margin;
          y = PAGE.margin + CARD_PADDING - 1;
          doc.setFontSize(10);
          doc.setTextColor(...ODS.text);
        }
        y += NOTE_LINE;
        doc.text(line, x, y);
      }
    }

    y += CARD_PADDING - 1;
    cardBorder(top, y - top);
    y += 5;
  }

  /* Page numbers */
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...ODS.caption);
    doc.text('Squad Health Check', PAGE.margin, PAGE.height - PAGE.margin + 2);
    doc.text(`${page} / ${pages}`, PAGE.width - PAGE.margin, PAGE.height - PAGE.margin + 2, { align: 'right' });
  }

  return doc;
}

/** jsPDF is loaded on demand: only the facilitator ever exports. */
export async function downloadPDF(session: ClientSessionState): Promise<void> {
  (await buildPDF(session)).save(`squad-health-check-${session.code}.pdf`);
}

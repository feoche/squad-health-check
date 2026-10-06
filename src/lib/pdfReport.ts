import type PDFKit from 'pdfkit';
import regularFontUrl from 'source-sans/OTF/SourceSans3-Regular.otf?url';
import boldFontUrl from 'source-sans/OTF/SourceSans3-Bold.otf?url';
import { ClientSessionState, Vote, VoteColor, VoteTrend } from '../types';
import { formatDate, numericDate, rows } from './exportReport';
import { LANG, Lang, messagesFor } from './i18n';
import { medianScore, scoreCell } from './voteScore';

/* The PDF holds what the Markdown export holds, laid out like the app.
 * It is an accessible PDF (PDF/UA-1): every piece of text is tagged in reading order
 * (H1, P, H2, then a section per category with its H3 and paragraphs), every decoration
 * is marked as an artifact, the language and title are set, and the fonts are embedded.
 * Text uses Source Sans 3, the ODS theme's font; colours are the ODS default theme's
 * token values, since the PDF cannot read CSS variables. */

type Doc = PDFKit.PDFDocument;
type StructElement = PDFKit.PDFStructureElement;
type Rgb = [number, number, number];

/** The embedded fonts: PDF/UA forbids relying on the reader's own */
export interface PdfFonts {
  regular: Uint8Array;
  bold: Uint8Array;
}

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

/** Layout is in mm, like the A4 page; PDFKit draws in points */
const pt = (mm: number) => (mm * 72) / 25.4;
const toMm = (points: number) => (points * 25.4) / 72;

/** A4 portrait, in mm */
const PAGE = { width: 210, height: 297, margin: 16, footer: 12 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
/** --ods-theme-border-radius (8px) and the badge's half of it, in mm */
const RADIUS = 2;
const BADGE_RADIUS = 1;
const CARD_PADDING = 5;
const NOTE_LINE = 5;

/** Writes `text` with its baseline at y (mm), never wrapping: the layout places every line itself */
function write(doc: Doc, text: string, x: number, y: number) {
  doc.text(text, pt(x), pt(y), { baseline: 'alphabetic', lineBreak: false });
}

const textWidth = (doc: Doc, text: string) => toMm(doc.widthOfString(text));

function style(doc: Doc, font: 'regular' | 'bold', size: number, color: Rgb) {
  doc.font(font).fontSize(size).fillColor(color);
}

/** Splits a note into lines that fit `width` mm, keeping its own line breaks; overlong words are cut */
export function wrapLines(doc: Doc, text: string, width: number): string[] {
  const fits = (line: string) => textWidth(doc, line) <= width;
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (line && !fits(line + char)) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Draws decoration that carries no meaning, kept out of what assistive technologies read */
function artifact(doc: Doc, draw: () => void, type: 'Layout' | 'Pagination' = 'Layout') {
  doc.markContent('Artifact', { type });
  draw();
  doc.endMarkedContent();
}

/** Adds a structure element under `parent` holding what `draw` writes */
function tagged(doc: Doc, parent: StructElement, type: string, draw: () => void): StructElement {
  const element = doc.struct(type);
  parent.add(element);
  const content = doc.markStructureContent(type);
  draw();
  doc.endMarkedContent();
  element.add(content);
  element.end();
  return element;
}

/** Arrow pointing right, up-right or down-right, beside the badge's text that already names the trend */
function drawTrendArrow(doc: Doc, trend: VoteTrend, x: number, y: number, size: number, color: Rgb) {
  const angle = { up: -Math.PI / 4, stable: 0, down: Math.PI / 4 }[trend];
  const cx = x + size / 2;
  const dx = (Math.cos(angle) * size) / 2;
  const dy = (Math.sin(angle) * size) / 2;
  const tip = [cx + dx, y + dy];
  const head = size * 0.4;
  doc.lineWidth(pt(0.35)).strokeColor(color).lineCap('round');
  doc.moveTo(pt(cx - dx), pt(y - dy)).lineTo(pt(tip[0]), pt(tip[1])).stroke();
  for (const side of [-1, 1]) {
    const a = angle + Math.PI + (side * Math.PI) / 4;
    doc.moveTo(pt(tip[0]), pt(tip[1])).lineTo(pt(tip[0] + Math.cos(a) * head), pt(tip[1] + Math.sin(a) * head)).stroke();
  }
}

/** "Median:" then the median as an ODS badge, e.g. [Orange · Stable →], or a dash without votes, as one paragraph */
function drawMedian(doc: Doc, section: StructElement, votes: Vote[], x: number, y: number, lang: Lang) {
  const m = messagesFor(lang);
  const label = m.report.medianOf('').trimEnd();
  style(doc, 'regular', 10, ODS.text);
  const badgeX = x + textWidth(doc, label) + 2;
  const score = medianScore(votes);

  if (score === null) {
    tagged(doc, section, 'P', () => {
      write(doc, `${label} `, x, y);
      doc.fillColor(ODS.caption);
      write(doc, '—', badgeX, y);
    });
    return;
  }

  const { color, trend } = scoreCell(score);
  const text = `${m.colors[color]} · ${m.trends[trend]}`;
  const arrow = 3;
  const padding = 2;
  const width = padding + textWidth(doc, text) + 1.5 + arrow + padding;
  artifact(doc, () => {
    doc.roundedRect(pt(badgeX), pt(y - 4.2), pt(width), pt(6), pt(BADGE_RADIUS)).fill(BADGE[color].background);
  });
  tagged(doc, section, 'P', () => {
    // The badge's fill just set the colour: back to the text's
    doc.fillColor(ODS.text);
    write(doc, `${label} `, x, y);
    doc.fillColor(BADGE[color].text);
    write(doc, text, badgeX + padding, y);
  });
  artifact(doc, () => drawTrendArrow(doc, trend, badgeX + width - padding - arrow, y - 1.2, arrow, BADGE[color].text));
}

/** The document's bytes, complete once it has ended */
function collect(doc: Doc): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => {
      const bytes = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(bytes);
    });
  });
}

/** Builds the report: a heading with the date and voters, then one card per category. */
export async function buildPDF(
  session: ClientSessionState,
  fonts: PdfFonts,
  date = new Date(),
  lang: Lang = LANG,
): Promise<Uint8Array<ArrayBuffer>> {
  const { default: PDFDocument } = await import('pdfkit');
  const m = messagesFor(lang);
  const r = m.report;
  const title = `Squad Health Check — ${numericDate(date)}`;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    // Footers are written once the page count is known
    bufferPages: true,
    font: fonts.regular,
    pdfVersion: '1.7',
    subset: 'PDF/UA',
    tagged: true,
    lang,
    displayTitle: true,
    info: { Title: title, Author: 'Squad Health Check', Subject: r.notes },
    // The typings predate fonts given as bytes
  } as unknown as PDFKit.PDFDocumentOptions);
  const output = collect(doc);
  doc.registerFont('regular', fonts.regular);
  doc.registerFont('bold', fonts.bold);
  const root = doc.struct('Document');
  doc.addStructure(root);

  const bottom = PAGE.height - PAGE.margin - PAGE.footer;
  let y = PAGE.margin;

  /* Heading */
  style(doc, 'bold', 22, ODS.heading);
  tagged(doc, root, 'H1', () => write(doc, title, PAGE.margin, y + 6));
  y += 14;
  style(doc, 'regular', 11, ODS.text);
  tagged(doc, root, 'P', () => write(doc, `Date: ${formatDate(date, lang)}`, PAGE.margin, y));
  y += 6;
  tagged(doc, root, 'P', () => write(doc, r.voters(session.totalVoters), PAGE.margin, y));
  y += 5;
  artifact(doc, () => {
    doc.lineWidth(pt(0.6)).strokeColor(ODS.primary);
    doc.moveTo(pt(PAGE.margin), pt(y)).lineTo(pt(PAGE.margin + CONTENT_WIDTH), pt(y)).stroke();
  });
  y += 11;

  style(doc, 'bold', 16, ODS.heading);
  tagged(doc, root, 'H2', () => write(doc, r.notes, PAGE.margin, y));
  y += 7;

  /* One card per category; a long note carries on in a card on the next page */
  const cardBorder = (top: number, height: number) =>
    artifact(doc, () => {
      doc.lineWidth(pt(0.3)).strokeColor(ODS.border);
      doc.roundedRect(pt(PAGE.margin), pt(top), pt(CONTENT_WIDTH), pt(height), pt(RADIUS)).stroke();
    });
  const noteWidth = CONTENT_WIDTH - 2 * CARD_PADDING;
  const headerHeight = CARD_PADDING + 14;

  for (const { n, title: name, result } of rows(session, lang)) {
    style(doc, 'regular', 10, ODS.text);
    const lines = result.notes.trim() ? wrapLines(doc, result.notes.trim(), noteWidth) : [];
    const notesHeight = lines.length ? 2 + lines.length * NOTE_LINE : 0;
    const fullHeight = headerHeight + notesHeight + CARD_PADDING - 1;

    // Keep the card whole when it fits on a page, and its header with at least two note lines otherwise
    const needed = Math.min(fullHeight, headerHeight + 2 + 2 * NOTE_LINE + CARD_PADDING);
    if (y + needed > bottom) {
      doc.addPage();
      y = PAGE.margin;
    }

    const section = doc.struct('Sect');
    root.add(section);
    let top = y;
    const x = PAGE.margin + CARD_PADDING;
    y += CARD_PADDING + 4;

    style(doc, 'bold', 13, ODS.heading);
    tagged(doc, section, 'H3', () => write(doc, `${n}. ${name}`, x, y));
    style(doc, 'regular', 10, ODS.caption);
    const count = m.votes(result.votes.length);
    tagged(doc, section, 'P', () =>
      write(doc, count, PAGE.margin + CONTENT_WIDTH - CARD_PADDING - textWidth(doc, count), y),
    );

    y += 8;
    drawMedian(doc, section, result.votes, x, y, lang);
    y += 2;

    if (lines.length) {
      y += 2;
      // One paragraph, its parts on each page the note runs over
      const note = doc.struct('P');
      section.add(note);
      let part = doc.markStructureContent('P');
      style(doc, 'regular', 10, ODS.text);
      for (const line of lines) {
        if (y + NOTE_LINE > bottom) {
          doc.endMarkedContent();
          note.add(part);
          cardBorder(top, y + CARD_PADDING - 1 - top);
          doc.addPage();
          top = PAGE.margin;
          y = PAGE.margin + CARD_PADDING - 1;
          part = doc.markStructureContent('P');
          style(doc, 'regular', 10, ODS.text);
        }
        y += NOTE_LINE;
        write(doc, line, x, y);
      }
      doc.endMarkedContent();
      note.add(part);
      note.end();
    }
    section.end();

    y += CARD_PADDING - 1;
    cardBorder(top, y - top);
    y += 5;
  }
  root.end();

  /* Page numbers: repeated on every page, so read once, as the page's furniture */
  const { start, count } = doc.bufferedPageRange();
  for (let page = start; page < start + count; page++) {
    doc.switchToPage(page);
    artifact(
      doc,
      () => {
        style(doc, 'regular', 8, ODS.caption);
        write(doc, 'Squad Health Check', PAGE.margin, PAGE.height - PAGE.margin + 2);
        const number = `${page + 1} / ${count}`;
        write(doc, number, PAGE.width - PAGE.margin - textWidth(doc, number), PAGE.height - PAGE.margin + 2);
      },
      'Pagination',
    );
  }

  doc.end();
  return output;
}

async function fetchFont(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font ${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** PDFKit and the fonts are loaded on demand: only the facilitator ever exports. */
export async function downloadPDF(session: ClientSessionState): Promise<void> {
  const [regular, bold] = await Promise.all([fetchFont(regularFontUrl), fetchFont(boldFontUrl)]);
  const bytes = await buildPDF(session, { regular, bold });
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `squad-health-check-${session.code}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { CategoryResult, ClientSessionState } from '../types';
import { buildPDF, PdfFonts } from './pdfReport';

const categories = [
  { name: 'Fun', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
  { name: 'Ownership', nameFr: 'Responsabilité', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
];

function finished(allResults: CategoryResult[]): ClientSessionState {
  const participants = [{ id: 'fac', name: 'Alice' }, { id: 'bob', name: 'Bob' }];
  return {
    code: 'ABC234',
    categories,
    participants,
    currentCategoryIndex: 1,
    phase: 'finished',
    voteCount: 0,
    totalVoters: 2,
    facilitatorVotes: true,
    anonymity: 'full',
    categoryMinutes: 10,
    roundStartedAt: null,
    eligibleVoters: participants,
    voterIds: [],
    disconnectedIds: [],
    hasVoted: false,
    myVote: null,
    isFacilitator: true,
    myId: 'fac',
    facilitatorId: 'fac',
    currentResults: null,
    liveResults: null,
    allResults,
    facilitatorNotes: {},
    facilitatorNotesLoaded: true,
    categoryResults: {},
    namedVotes: {},
    offlineVotes: {},
  };
}

const fun: CategoryResult = {
  categoryIndex: 0,
  votes: [
    { color: 'orange', trend: 'stable' },
    { color: 'orange', trend: 'up' },
  ],
  notes: 'we laughed a lot',
};
const ownership: CategoryResult = { categoryIndex: 1, votes: [], notes: '' };

const require = createRequire(import.meta.url);
const font = (name: string) => new Uint8Array(readFileSync(require.resolve(`source-sans/OTF/${name}.otf`)));
const fonts: PdfFonts = { regular: font('SourceSans3-Regular'), bold: font('SourceSans3-Bold') };

interface StructNode {
  role?: string;
  type?: string;
  id?: string;
  children?: StructNode[];
}

/**
 * The PDF as assistive technologies read it: each tagged element with its text, in reading order,
 * plus the text left out as artifacts, the metadata and the page count.
 */
async function readPDF(results: CategoryResult[], lang: 'en' | 'fr') {
  const bytes = await buildPDF(finished(results), fonts, new Date(2026, 9, 6), lang);
  const pdf = await getDocument({ data: bytes, useSystemFonts: false }).promise;
  const tags: [string, string][] = [];
  const artifacts: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const textById = new Map<string, string>();
    const open: (string | null)[] = [];
    for (const item of (await page.getTextContent({ includeMarkedContent: true })).items) {
      if ('type' in item && item.type.startsWith('beginMarkedContent')) {
        const { tag, id } = item as { tag?: string; id?: string };
        open.push(tag === 'Artifact' ? 'artifact' : (id ?? null));
      }
      else if ('type' in item && item.type === 'endMarkedContent') open.pop();
      else if ('str' in item && item.str) {
        const id = open[open.length - 1];
        if (id === 'artifact') {
          if (item.str.trim()) artifacts.push(item.str);
        }
        else if (id) textById.set(id, (textById.get(id) ?? '') + item.str);
        else throw new Error(`Untagged text: ${item.str}`);
      }
    }
    const walk = (node: StructNode) => {
      const text = (node.children ?? []).filter((c) => c.type === 'content').map((c) => textById.get(c.id!) ?? '').join('');
      if (node.role && text.trim()) tags.push([node.role, text.trim()]);
      (node.children ?? []).filter((c) => c.role).forEach(walk);
    };
    walk((await page.getStructTree()) as StructNode);
  }
  const { info } = (await pdf.getMetadata()) as { info: Record<string, unknown> };
  const markInfo = (await pdf.getMarkInfo()) as Map<string, boolean> | null;
  const viewer = (await pdf.getViewerPreferences()) as Map<string, unknown> | null;
  return { tags, artifacts, info, marked: markInfo?.get('Marked'), displayTitle: viewer?.get('DisplayDocTitle'), pages: pdf.numPages };
}

/** Text of the elements tagged `role`, joined across pages for one that runs over a page break */
const tagged = (tags: [string, string][], role: string) => tags.filter(([r]) => r === role).map(([, text]) => text);

describe('buildPDF', () => {
  it('holds what the Markdown export holds: date, voters, and each category with its median and note', async () => {
    const { tags } = await readPDF([fun, ownership], 'en');
    expect(tags).toEqual([
      ['H1', 'Squad Health Check — 2026/10/06'],
      ['P', 'Date: 6 October 2026'],
      ['P', 'Voters: 2'],
      ['H2', 'Notes'],
      ['H3', '1. Fun'],
      ['P', '2 votes'],
      ['P', 'Median: Orange · Improving'],
      ['P', 'we laughed a lot'],
      ['H3', '2. Ownership'],
      ['P', '0 votes'],
      ['P', 'Median: —'],
    ]);
    expect(JSON.stringify(tags)).not.toContain('Alice');
    expect(JSON.stringify(tags)).not.toContain('ABC234');
  });

  it('is a tagged PDF/UA document with a language and a title', async () => {
    const { info, marked, displayTitle, artifacts } = await readPDF([fun, ownership], 'en');
    expect(marked).toBe(true);
    // Readers show the title rather than the file name
    expect(displayTitle).toBe(true);
    expect(info.Language).toBe('en');
    expect(info.Title).toBe('Squad Health Check — 2026/10/06');
    // The footer repeats on every page: it is page furniture, not content
    expect(artifacts).toEqual(['Squad Health Check', '1 / 1']);
  });

  it('writes the report in French for French users', async () => {
    const { tags, info } = await readPDF([fun, ownership], 'fr');
    expect(info.Language).toBe('fr');
    expect(tagged(tags, 'P')).toContain('Nombre de votants : 2');
    expect(tagged(tags, 'P')).toContain('Médiane : Orange · En amélioration');
    expect(tagged(tags, 'P')).toContain('0 vote');
  });

  it('carries a long note over to the next pages, in one paragraph', async () => {
    const long = { ...fun, notes: Array.from({ length: 120 }, (_, i) => `line ${i}`).join('\n') };
    const { tags, pages } = await readPDF([long, ownership], 'en');
    expect(pages).toBeGreaterThan(1);
    const note = tagged(tags, 'P').filter((text) => text.startsWith('line'));
    expect(note.join('')).toContain('line 119');
    expect(tagged(tags, 'H3')).toEqual(['1. Fun', '2. Ownership']);
  });
});

import { describe, it, expect } from 'vitest';
import { CategoryResult, ClientSessionState } from '../types';
import { buildPDF } from './pdfReport';

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

/** The raw PDF: jsPDF leaves content streams uncompressed, text in WinAnsi bytes (\x97 is an em dash) */
async function pdfText(results: CategoryResult[], lang: 'en' | 'fr') {
  const doc = await buildPDF(finished(results), new Date(2026, 9, 6), lang);
  return doc.output();
}

describe('buildPDF', () => {
  it('holds what the Markdown export holds: date, voters, and each category with its median and note', async () => {
    const text = await pdfText([fun, ownership], 'en');
    expect(text).toContain('(Squad Health Check \x97 2026/10/06)');
    expect(text).toContain('(Date: 6 October 2026)');
    expect(text).toContain('(Voters: 2)');
    expect(text).toContain('(1. Fun)');
    expect(text).toContain('(2 votes)');
    expect(text).toContain('(Orange \xb7 Improving)');
    expect(text).toContain('(we laughed a lot)');
    expect(text).toContain('(2. Ownership)');
    expect(text).not.toContain('Alice');
    expect(text).not.toContain('ABC234');
  });

  it('writes the report in French for French users', async () => {
    const text = await pdfText([fun, ownership], 'fr');
    expect(text).toContain('(Nombre de votants : 2)');
    expect(text).toContain('(M\xe9diane :)');
    expect(text).toContain('(0 vote)');
  });

  it('carries a long note over to the next pages', async () => {
    const long = { ...fun, notes: Array.from({ length: 120 }, (_, i) => `line ${i}`).join('\n') };
    const doc = await buildPDF(finished([long, ownership]), new Date(2026, 9, 6), 'en');
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output()).toContain('(line 119)');
  });
});

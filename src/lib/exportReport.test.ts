import { describe, it, expect } from 'vitest';
import { CategoryResult, ClientSessionState } from '../types';
import { generateMarkdown } from './exportReport';

const categories = [
  { name: 'Fun', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
  { name: 'Ownership', nameFr: 'Responsabilité', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
];

function finished(allResults: CategoryResult[], namedVotes: ClientSessionState['namedVotes'] = {}): ClientSessionState {
  const participants = [{ id: 'fac', name: 'Alice' }];
  return {
    code: 'ABC234',
    categories,
    participants,
    currentCategoryIndex: 1,
    phase: 'finished',
    voteCount: 0,
    totalVoters: 1,
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
    namedVotes,
    offlineVotes: {},
  };
}

const empty = (categoryIndex: number): CategoryResult => ({
  categoryIndex,
  votes: [],
  notes: '',
});

const funVotes: CategoryResult = {
  categoryIndex: 0,
  votes: [
    { color: 'orange', trend: 'stable' },
    { color: 'orange', trend: 'up' },
  ],
  notes: 'we laughed a lot',
};

const section = (md: string, from: string, to?: string) =>
  md.slice(md.indexOf(from), to ? md.indexOf(to) : undefined);

describe('generateMarkdown', () => {
  it('opens with the session date and the number of voters', () => {
    const md = generateMarkdown(finished([funVotes, empty(1)]), new Date(2026, 9, 6));
    expect(md.startsWith('# Squad Health Check — 2026/10/06\n\nDate: 6 October 2026\nVoters: 1\n\n')).toBe(true);
  });

  it('gives each category its vote count, median and note', () => {
    const md = generateMarkdown(finished([funVotes, empty(1)]));
    expect(md).toContain('## Notes');
    expect(section(md, '### 1. Fun', '### 2. Ownership')).toBe(
      '### 1. Fun (2 votes)\nMedian: 🟠 ↗\n\nwe laughed a lot\n\n',
    );
    expect(section(md, '### 2. Ownership')).toBe('### 2. Ownership (0 votes)\nMedian: —\n\n');
  });

  it('leaves out what the recap does not show', () => {
    const md = generateMarkdown(finished([funVotes, empty(1)]));
    expect(md).not.toContain('ABC234');
    expect(md).not.toContain('Participants');
    expect(md).not.toContain('/9');
    expect(md).not.toContain('🟢');
    expect(md).not.toContain('Trend');
    expect(md).not.toContain('**Green:**');
    expect(md).not.toContain('Discussion Notes');
    expect(md).not.toContain('| # |');
  });

  it('writes the report in French for French users', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]), new Date(2026, 9, 5), 'fr');
    expect(md).toContain('# Squad Health Check — 2026/10/05');
    expect(md).toContain('Date: 5 octobre 2026\nNombre de votants : 1');
    expect(md).toContain('### 2. Responsabilité (0 vote)\nMédiane : —');
  });

  it('lists no names, even when they are available', () => {
    const md = generateMarkdown(
      finished([{ categoryIndex: 0, votes: [{ color: 'green', trend: 'up' }], notes: '' }, empty(1)], {
        0: [{ id: 'fac', name: 'Alice', vote: { color: 'green', trend: 'up' } }],
      }),
    );
    expect(md).not.toContain('Alice');
  });
});

import { describe, it, expect } from 'vitest';
import { CategoryResult, ClientSessionState } from '../types';
import { dominantColor, dominantTrend, generateMarkdown } from './exportReport';

const categories = [
  { name: 'Fun', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
  { name: 'Ownership', nameFr: 'Responsabilité', positiveDescription: 'p', mixedDescription: 'm', negativeDescription: 'n' },
];

function finished(allResults: CategoryResult[]): ClientSessionState {
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
  };
}

const empty = (categoryIndex: number): CategoryResult => ({
  categoryIndex,
  votes: [],
  notes: '',
});

describe('generateMarkdown', () => {
  it('includes the discussion notes', () => {
    const md = generateMarkdown(
      finished([
        {
          categoryIndex: 0,
          votes: [{ color: 'green', trend: 'up' }],
          notes: 'we laughed a lot',
        },
        empty(1),
      ]),
    );
    const fun = md.slice(md.indexOf('### 1. Fun'), md.indexOf('### 2. Ownership'));
    expect(fun).toContain('**Discussion Notes:**');
    expect(fun).toContain('we laughed a lot');
  });

  it('omits notes when empty', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).not.toContain('Discussion Notes');
  });

  it('shows a dash instead of a dominant value for a category without votes', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).toContain('| 2 | Ownership | — | — |');
  });

  it('writes the report in French for French users', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]), new Date(2026, 9, 5), 'fr');
    expect(md).toContain('5 octobre 2026');
    expect(md).toContain('## Synthèse des résultats');
    expect(md).toContain('| 2 | Responsabilité | — | — |');
    expect(md).toContain('### 2. Responsabilité (Ownership)');
    expect(md).toContain('**Vert:** p');
  });
});

describe('dominantColor / dominantTrend', () => {
  it('returns null without votes', () => {
    expect(dominantColor([])).toBeNull();
    expect(dominantTrend([])).toBeNull();
  });

  it('favours the healthier value on ties', () => {
    expect(dominantColor([{ color: 'green', trend: 'down' }, { color: 'red', trend: 'up' }])).toBe('green');
    expect(dominantTrend([{ color: 'green', trend: 'down' }, { color: 'red', trend: 'up' }])).toBe('up');
  });

  it('picks the most voted value', () => {
    const votes = [
      { color: 'orange', trend: 'stable' },
      { color: 'red', trend: 'down' },
      { color: 'red', trend: 'down' },
    ] as const;
    expect(dominantColor([...votes])).toBe('red');
    expect(dominantTrend([...votes])).toBe('down');
  });
});

import { describe, it, expect } from 'vitest';
import { CategoryResult, ClientSessionState } from '../types';
import { dominantColor, dominantTrend, generateMarkdown } from './exportReport';

const categories = [
  { name: 'Fun', positiveDescription: 'p', negativeDescription: 'n' },
  { name: 'Learning', nameFr: 'Apprentissage', positiveDescription: 'p', negativeDescription: 'n' },
];

function finished(allResults: CategoryResult[]): ClientSessionState {
  return {
    code: 'ABC234',
    categories,
    participants: [{ id: 'fac', name: 'Alice' }],
    currentCategoryIndex: 1,
    phase: 'finished',
    voteCount: 0,
    totalParticipants: 1,
    hasVoted: false,
    isFacilitator: true,
    myId: 'fac',
    facilitatorId: 'fac',
    currentResults: null,
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
  takeaway: '',
});

describe('generateMarkdown', () => {
  it('puts the takeaway before the discussion notes', () => {
    const md = generateMarkdown(
      finished([
        {
          categoryIndex: 0,
          votes: [{ color: 'green', trend: 'up' }],
          notes: 'we laughed a lot',
          takeaway: 'keep Friday demos',
        },
        empty(1),
      ]),
    );
    const fun = md.slice(md.indexOf('### 1. Fun'), md.indexOf('### 2. Learning'));
    expect(fun).toContain('**Takeaway:** keep Friday demos');
    expect(fun).toContain('we laughed a lot');
    expect(fun.indexOf('**Takeaway:**')).toBeLessThan(fun.indexOf('**Discussion Notes:**'));
  });

  it('omits takeaway and notes when empty', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).not.toContain('Takeaway');
    expect(md).not.toContain('Discussion Notes');
  });

  it('shows a dash instead of a dominant value for a category without votes', () => {
    const md = generateMarkdown(finished([empty(0), empty(1)]));
    expect(md).toContain('| 2 | Learning | — | — |');
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

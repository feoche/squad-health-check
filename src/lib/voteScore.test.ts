import { describe, it, expect } from 'vitest';
import { Vote, VoteColor, VoteTrend } from '../types';
import { formatScore, medianScore, scoreCell, voteWeight } from './voteScore';

const vote = (color: VoteColor, trend: VoteTrend): Vote => ({ color, trend });

describe('voteWeight', () => {
  it('ranks colour before trend, from red getting worse (1) to green improving (9)', () => {
    expect(voteWeight(vote('red', 'down'))).toBe(1);
    expect(voteWeight(vote('red', 'stable'))).toBe(2);
    expect(voteWeight(vote('red', 'up'))).toBe(3);
    expect(voteWeight(vote('orange', 'down'))).toBe(4);
    expect(voteWeight(vote('orange', 'stable'))).toBe(5);
    expect(voteWeight(vote('orange', 'up'))).toBe(6);
    expect(voteWeight(vote('green', 'down'))).toBe(7);
    expect(voteWeight(vote('green', 'stable'))).toBe(8);
    expect(voteWeight(vote('green', 'up'))).toBe(9);
  });
});

describe('medianScore', () => {
  it('returns null without votes', () => {
    expect(medianScore([])).toBeNull();
  });

  it('takes the middle weight of an odd number of votes, whatever their order', () => {
    expect(medianScore([vote('green', 'up'), vote('red', 'down'), vote('orange', 'up')])).toBe(6);
  });

  it('averages the two middle weights of an even number of votes', () => {
    expect(medianScore([vote('orange', 'stable'), vote('orange', 'up')])).toBe(5.5);
    expect(medianScore([vote('red', 'down'), vote('green', 'up'), vote('orange', 'up'), vote('orange', 'up')])).toBe(6);
  });
});

describe('scoreCell', () => {
  it('maps a whole score back to its colour and trend', () => {
    expect(scoreCell(1)).toEqual(vote('red', 'down'));
    expect(scoreCell(6)).toEqual(vote('orange', 'up'));
    expect(scoreCell(9)).toEqual(vote('green', 'up'));
  });

  it('rounds a half score up to the healthier cell', () => {
    expect(scoreCell(5.5)).toEqual(vote('orange', 'up'));
    expect(scoreCell(6.5)).toEqual(vote('green', 'down'));
  });
});

describe('formatScore', () => {
  it('writes the score out of 9 with the language decimal separator', () => {
    expect(formatScore(6, 'en')).toBe('6/9');
    expect(formatScore(5.5, 'en')).toBe('5.5/9');
    expect(formatScore(5.5, 'fr')).toBe('5,5/9');
  });
});

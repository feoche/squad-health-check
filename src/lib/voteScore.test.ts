import { describe, it, expect } from 'vitest';
import { Vote, VoteColor, VoteTrend } from '../types';
import {
  colorOf,
  colorVotes,
  cellKey,
  formatScore,
  isColorVote,
  isRangeVote,
  medianScore,
  rangeVotes,
  sameCell,
  scoreCell,
  scoreCounts,
  trendCounts,
  voteWeight,
} from './voteScore';

const vote = (color: VoteColor, trend: VoteTrend): Vote => ({ color, trend });
const range = (score: number, trend: VoteTrend = 'stable'): Vote => ({ score, trend });

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

describe('range votes', () => {
  it('weighs a range vote by its score', () => {
    expect(voteWeight(range(1))).toBe(1);
    expect(voteWeight(range(7, 'up'))).toBe(7);
  });

  it('takes the median of the scores, a half with an even count', () => {
    expect(medianScore([range(2), range(9), range(4)])).toBe(4);
    expect(medianScore([range(4), range(5)])).toBe(4.5);
    expect(medianScore([])).toBeNull();
  });

  it('tells the two vote shapes apart and never invents a color', () => {
    expect(isRangeVote(range(3))).toBe(true);
    expect(isColorVote(range(3))).toBe(false);
    expect(colorOf(range(3))).toBeUndefined();
    expect(colorOf(vote('red', 'down'))).toBe('red');
    expect(colorVotes([range(3), vote('red', 'down')])).toEqual([vote('red', 'down')]);
    expect(rangeVotes([range(3), vote('red', 'down')])).toEqual([range(3)]);
  });

  it('counts the votes of each score from 1 to 9', () => {
    expect(scoreCounts([range(1), range(9), range(9)] as { score: number; trend: VoteTrend }[])).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0, 2,
    ]);
  });

  it('counts the votes of each trend', () => {
    expect(trendCounts([range(1, 'up'), vote('red', 'up'), range(5, 'down')])).toEqual({ up: 2, stable: 0, down: 1 });
  });

  it('names a vote cell and compares cells within a shape', () => {
    expect(cellKey(range(7, 'up'))).toBe('7/up');
    expect(cellKey(vote('red', 'down'))).toBe('red/down');
    expect(sameCell(range(7, 'up'), range(7, 'up'))).toBe(true);
    expect(sameCell(range(7, 'up'), range(7, 'down'))).toBe(false);
    expect(sameCell(range(7, 'up'), vote('green', 'up'))).toBe(false);
  });

  it('writes a half score with its decimal', () => {
    expect(formatScore(6)).toBe('6');
    expect(formatScore(5.5)).toBe('5.5');
  });
});

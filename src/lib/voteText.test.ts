import { describe, it, expect } from 'vitest';
import { voteText } from './voteText';
import { t } from './i18n';

describe('voteText', () => {
  it('names a color vote with its trend', () => {
    expect(voteText({ color: 'green', trend: 'up' })).toBe(`${t.colors.green}, ${t.trends.up}`);
  });

  it('names a range vote with its trend', () => {
    expect(voteText({ score: 7, trend: 'stable' })).toBe(`${t.voting.scoreValue(7)}, ${t.trends.stable}`);
  });
});

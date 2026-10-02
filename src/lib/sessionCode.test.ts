import { describe, it, expect } from 'vitest';
import { generateSessionCode, randomKey, CODE_PATTERN } from './sessionCode';

describe('generateSessionCode', () => {
  it('returns 6 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateSessionCode()).toMatch(CODE_PATTERN);
    }
  });

  it('never contains I, O, 0 or 1', () => {
    const all = Array.from({ length: 500 }, generateSessionCode).join('');
    expect(all).not.toMatch(/[IO01]/);
  });

  it('is not constant', () => {
    const codes = new Set(Array.from({ length: 50 }, generateSessionCode));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe('randomKey', () => {
  it('returns 20 alphanumeric chars', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomKey()).toMatch(/^[A-Za-z0-9]{20}$/);
    }
  });

  it('is not time-ordered (no shared prefix between consecutive keys)', () => {
    const keys = Array.from({ length: 20 }, randomKey);
    const sharedPrefix = keys.filter((k, i) => i > 0 && k.slice(0, 4) === keys[i - 1].slice(0, 4));
    expect(sharedPrefix.length).toBeLessThan(2);
  });
});

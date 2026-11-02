import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  generateSessionCode,
  randomKey,
  isExpired,
  CODE_PATTERN,
  CODE_WORDS,
  SESSION_LIFETIME_MS,
} from './sessionCode';

describe('generateSessionCode', () => {
  it('returns a word from the list, matching the code pattern', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateSessionCode();
      expect(CODE_WORDS).toContain(code);
      expect(code).toMatch(CODE_PATTERN);
    }
  });

  it('has a list of unique six-letter words', () => {
    expect(new Set(CODE_WORDS).size).toBe(CODE_WORDS.length);
    for (const word of CODE_WORDS) expect(word).toMatch(/^[A-Z]{6}$/);
  });

  it('is not constant', () => {
    const codes = new Set(Array.from({ length: 50 }, generateSessionCode));
    expect(codes.size).toBeGreaterThan(30);
  });
});

describe('CODE_PATTERN', () => {
  it('still accepts the older random codes', () => {
    expect(CODE_PATTERN.test('K7M2QX')).toBe(true);
  });

  it('rejects other lengths and characters', () => {
    for (const code of ['PIRAT', 'PIRATES', 'pirate', 'PIR0TE', 'PIRA-E']) {
      expect(CODE_PATTERN.test(code)).toBe(false);
    }
  });
});

describe('isExpired', () => {
  const now = Date.UTC(2026, 9, 7);

  it('keeps a session for 183 days', () => {
    expect(isExpired(now - SESSION_LIFETIME_MS, now)).toBe(false);
    expect(isExpired(now - SESSION_LIFETIME_MS - 1, now)).toBe(true);
  });

  it('matches the duration in the database rules', () => {
    const rules = readFileSync(resolve(__dirname, '../../database.rules.json'), 'utf8');
    expect(rules).toContain(`now - ${SESSION_LIFETIME_MS}`);
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

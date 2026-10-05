import { describe, expect, it } from 'vitest';
import { detectLang } from './i18n';

describe('detectLang', () => {
  it('picks French for any FR locale', () => {
    expect(detectLang('fr')).toBe('fr');
    expect(detectLang('fr-FR')).toBe('fr');
    expect(detectLang('fr-CA')).toBe('fr');
  });

  it('falls back to English otherwise', () => {
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang('de-DE')).toBe('en');
    expect(detectLang('')).toBe('en');
  });
});

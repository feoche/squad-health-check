import { describe, expect, it } from 'vitest';
import * as i18n from './i18n';
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

describe('switchLang', () => {
  it('swaps messages in place and notifies subscribers', () => {
    const start = i18n.LANG;
    const other = start === 'fr' ? 'en' : 'fr';
    let calls = 0;
    const unsubscribe = i18n.subscribeLang(() => calls++);

    i18n.switchLang(other);
    expect(i18n.LANG).toBe(other);
    expect(i18n.t).toBe(i18n.messagesFor(other));
    expect(calls).toBe(1);

    i18n.switchLang(start);
    unsubscribe();
    expect(i18n.t).toBe(i18n.messagesFor(start));
  });
});

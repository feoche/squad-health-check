import { describe, it, expect } from 'vitest';
import {
  CATEGORY_PRESETS,
  RECOMMENDED_MAX_CATEGORIES,
  builtInCategories,
  defaultCategories,
  detectPreset,
  presetCategories,
} from './categoryPresets';

describe('category presets', () => {
  it('keeps every color description under 100 characters', () => {
    for (const c of builtInCategories) {
      for (const text of [
        c.positiveDescription,
        c.negativeDescription,
        c.positiveDescriptionFr ?? '',
        c.negativeDescriptionFr ?? '',
      ]) {
        expect(text.length, `${c.name}: ${text}`).toBeLessThan(100);
      }
    }
  });

  it('provides French names and descriptions for every category', () => {
    for (const c of builtInCategories) {
      expect(c.nameFr, c.name).toBeTruthy();
      expect(c.positiveDescriptionFr, c.name).toBeTruthy();
      expect(c.negativeDescriptionFr, c.name).toBeTruthy();
    }
  });

  it('selects no more categories by default than recommended', () => {
    for (const preset of CATEGORY_PRESETS) {
      expect(presetCategories[preset].selected.length, preset).toBeLessThanOrEqual(
        RECOMMENDED_MAX_CATEGORIES,
      );
    }
  });

  it('gives our set 15 categories and starts new sessions with it', () => {
    const { selected, extra } = presetCategories.ours;
    expect(selected.length + extra.length).toBe(15);
    expect(defaultCategories).toBe(selected);
  });

  it('gives every category of a set its own name', () => {
    for (const preset of CATEGORY_PRESETS) {
      const { selected, extra } = presetCategories[preset];
      const names = [...selected, ...extra].map((c) => c.name);
      expect(new Set(names).size, preset).toBe(names.length);
    }
  });

  it('only shares a name between sets when the category is the same', () => {
    const [ours, spotify] = CATEGORY_PRESETS.map((p) => [
      ...presetCategories[p].selected,
      ...presetCategories[p].extra,
    ]);
    for (const c of ours) {
      const twin = spotify.find((s) => s.name === c.name);
      if (twin) expect(twin, c.name).toEqual(c);
    }
  });
});

describe('detectPreset', () => {
  it('recognises each preset from its selection', () => {
    expect(detectPreset(presetCategories.ours.selected)).toBe('ours');
    expect(detectPreset(presetCategories.spotify.selected)).toBe('spotify');
  });

  it('keeps recognising a preset after categories were removed', () => {
    expect(detectPreset(presetCategories.spotify.selected.slice(0, 4))).toBe('spotify');
  });

  it('falls back to our set for an empty or custom selection', () => {
    expect(detectPreset([])).toBe('ours');
  });
});

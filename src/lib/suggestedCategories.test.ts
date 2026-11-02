import { describe, it, expect } from 'vitest';
import { suggestedCategories } from './suggestedCategories';
import { builtInCategories, defaultCategories, presetCategories } from '../data/categoryPresets';

const extraCategories = presetCategories.ours.extra;

describe('suggestedCategories', () => {
  it('suggests the extra categories next to the default selection', () => {
    expect(suggestedCategories(defaultCategories)).toEqual(extraCategories);
  });

  it('suggests a removed built-in category again, in built-in order', () => {
    const [first, ...rest] = defaultCategories;
    expect(suggestedCategories(rest)).toEqual([first, ...extraCategories]);
  });

  it('does not suggest a category already selected, even after it was edited', () => {
    const edited = { ...extraCategories[0], positiveDescription: 'Our own wording' };
    expect(suggestedCategories([edited])).not.toContainEqual(extraCategories[0]);
  });

  it('suggests nothing once every category of the preset is selected', () => {
    const { selected, extra } = presetCategories.ours;
    expect(suggestedCategories([...selected, ...extra])).toEqual([]);
  });

  it('suggests the categories of the preset asked for', () => {
    const { selected, extra } = presetCategories.spotify;
    expect(suggestedCategories(selected, [], 'spotify')).toEqual(extra);
  });

  it('does not suggest the other preset, but keeps its categories built-in', () => {
    const spotifyOnly = presetCategories.spotify.extra[0];
    expect(suggestedCategories(defaultCategories)).not.toContainEqual(spotifyOnly);
    expect(builtInCategories).toContainEqual(spotifyOnly);
  });

  it('suggests a removed custom category after the built-in ones', () => {
    const custom = { name: 'Ownership', positiveDescription: 'p', negativeDescription: 'n' };
    expect(suggestedCategories(defaultCategories, [custom])).toEqual([...extraCategories, custom]);
  });

  it('suggests a removed built-in category with its edits, in built-in order', () => {
    const [first, ...rest] = defaultCategories;
    const edited = { ...first, positiveDescription: 'Our own wording' };
    expect(suggestedCategories(rest, [edited])).toEqual([edited, ...extraCategories]);
  });

  it('does not suggest a removed category once it is selected again', () => {
    const custom = { name: 'Ownership', positiveDescription: 'p', negativeDescription: 'n' };
    expect(suggestedCategories([...defaultCategories, custom], [custom])).toEqual(extraCategories);
  });
});

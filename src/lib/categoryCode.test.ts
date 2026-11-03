import { describe, it, expect } from 'vitest';
import { categoriesToCode, parseCategoryCode } from './categoryCode';
import { ourCategories } from '../data/ourCategories';

const valid = { name: 'Autonomy', positiveDescription: 'p', negativeDescription: 'n' };

describe('parseCategoryCode', () => {
  it('reads back the code it writes', () => {
    expect(parseCategoryCode(categoriesToCode(ourCategories))).toEqual({ ok: true, categories: ourCategories });
  });

  it('accepts an empty list', () => {
    expect(parseCategoryCode('[]')).toEqual({ ok: true, categories: [] });
  });

  it('trims the texts and drops empty French fields and unknown keys', () => {
    const code = JSON.stringify([{ ...valid, name: ' Autonomy ', nameFr: '  ', color: 'blue' }]);
    expect(parseCategoryCode(code)).toEqual({ ok: true, categories: [valid] });
  });

  it('reports invalid JSON', () => {
    expect(parseCategoryCode('[{')).toMatchObject({ ok: false, error: { kind: 'syntax' } });
  });

  it('reports a value that is not a list', () => {
    expect(parseCategoryCode(JSON.stringify(valid))).toEqual({ ok: false, error: { kind: 'notList' } });
  });

  it('reports an entry that is not an object, with its position from 1', () => {
    expect(parseCategoryCode(JSON.stringify([valid, 'x']))).toEqual({
      ok: false,
      error: { kind: 'notObject', position: 2 },
    });
  });

  it('reports a missing mandatory field', () => {
    expect(parseCategoryCode(JSON.stringify([{ ...valid, negativeDescription: ' ' }]))).toEqual({
      ok: false,
      error: { kind: 'missing', position: 1, field: 'negativeDescription' },
    });
  });

  it('reports a field that is not text', () => {
    expect(parseCategoryCode(JSON.stringify([{ ...valid, nameFr: 3 }]))).toEqual({
      ok: false,
      error: { kind: 'notText', position: 1, field: 'nameFr' },
    });
  });

  it('reports a name used twice', () => {
    expect(parseCategoryCode(JSON.stringify([valid, valid]))).toEqual({
      ok: false,
      error: { kind: 'duplicate', position: 2, name: 'Autonomy' },
    });
  });
});

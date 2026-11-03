import { Category } from '../types';

const REQUIRED_FIELDS = ['name', 'positiveDescription', 'negativeDescription'] as const;
const OPTIONAL_FIELDS = ['nameFr', 'positiveDescriptionFr', 'negativeDescriptionFr'] as const;
export type CategoryField = (typeof REQUIRED_FIELDS)[number] | (typeof OPTIONAL_FIELDS)[number];

/** Why the code was refused; positions count from 1, as people read the list */
export type CategoryCodeError =
  | { kind: 'syntax'; detail: string }
  | { kind: 'notList' }
  | { kind: 'notObject'; position: number }
  | { kind: 'missing'; position: number; field: CategoryField }
  | { kind: 'notText'; position: number; field: CategoryField }
  | { kind: 'duplicate'; position: number; name: string };

export type CategoryCodeResult =
  | { ok: true; categories: Category[] }
  | { ok: false; error: CategoryCodeError };

/** The categories as the JSON shown in the code tab */
export const categoriesToCode = (categories: Category[]) => JSON.stringify(categories, null, 2);

/**
 * Reads categories typed as JSON, with the same rules as the form: English name and
 * descriptions mandatory, French ones optional. Unknown keys are dropped.
 */
export function parseCategoryCode(code: string): CategoryCodeResult {
  let value: unknown;
  try {
    value = JSON.parse(code);
  } catch (e) {
    return { ok: false, error: { kind: 'syntax', detail: e instanceof Error ? e.message : String(e) } };
  }
  if (!Array.isArray(value)) return { ok: false, error: { kind: 'notList' } };

  const categories: Category[] = [];
  const names = new Set<string>();
  for (const [i, entry] of value.entries()) {
    const position = i + 1;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { ok: false, error: { kind: 'notObject', position } };
    }
    const fields = entry as Record<string, unknown>;
    const category: Partial<Record<CategoryField, string>> = {};
    for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
      const raw = fields[field];
      if (raw === undefined || raw === null) continue;
      if (typeof raw !== 'string') return { ok: false, error: { kind: 'notText', position, field } };
      const text = raw.trim();
      if (text) category[field] = text;
    }
    const missing = REQUIRED_FIELDS.find((field) => !category[field]);
    if (missing) return { ok: false, error: { kind: 'missing', position, field: missing } };
    const name = category.name!;
    if (names.has(name)) return { ok: false, error: { kind: 'duplicate', position, name } };
    names.add(name);
    categories.push(category as Category);
  }
  return { ok: true, categories };
}

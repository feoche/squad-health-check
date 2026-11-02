import { Category } from '../types';

const OPTIONAL_FIELDS = ['nameFr', 'positiveDescriptionFr', 'negativeDescriptionFr'] as const;

/** Firebase rejects `undefined` values: keep only known fields, drop unset French ones. */
export function toFirebaseCategories(categories: Category[]): Category[] {
  return categories.map((category) => {
    const { name, positiveDescription, negativeDescription } = category;
    const out: Category = { name, positiveDescription, negativeDescription };
    for (const field of OPTIONAL_FIELDS) {
      if (category[field]) out[field] = category[field];
    }
    return out;
  });
}

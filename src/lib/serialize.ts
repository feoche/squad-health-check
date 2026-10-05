import { Category } from '../types';

const OPTIONAL_FIELDS = ['nameFr', 'positiveDescriptionFr', 'mixedDescriptionFr', 'negativeDescriptionFr'] as const;

/** Firebase rejects `undefined` values: keep only known fields, drop unset French ones. */
export function toFirebaseCategories(categories: Category[]): Category[] {
  return categories.map((category) => {
    const { name, positiveDescription, mixedDescription, negativeDescription } = category;
    const out: Category = { name, positiveDescription, mixedDescription, negativeDescription };
    for (const field of OPTIONAL_FIELDS) {
      if (category[field]) out[field] = category[field];
    }
    return out;
  });
}

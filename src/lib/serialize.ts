import { Category } from '../types';

/** Firebase rejects `undefined` values: keep only known fields, drop unset nameFr. */
export function toFirebaseCategories(categories: Category[]): Category[] {
  return categories.map(({ name, nameFr, positiveDescription, mixedDescription, negativeDescription }) => ({
    name,
    positiveDescription,
    mixedDescription,
    negativeDescription,
    ...(nameFr ? { nameFr } : {}),
  }));
}

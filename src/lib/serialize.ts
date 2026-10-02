import { Category } from '../types';

/** Firebase rejects `undefined` values: keep only known fields, drop unset nameFr. */
export function toFirebaseCategories(categories: Category[]): Category[] {
  return categories.map(({ name, nameFr, positiveDescription, negativeDescription }) => ({
    name,
    positiveDescription,
    negativeDescription,
    ...(nameFr ? { nameFr } : {}),
  }));
}

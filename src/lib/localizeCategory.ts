import { Category } from '../types';
import { LANG, Lang } from './i18n';

export interface LocalizedCategory {
  /** Name in the user's language */
  title: string;
  /** Name in the other language, when there is one */
  subtitle?: string;
  positiveDescription: string;
  mixedDescription: string;
  negativeDescription: string;
}

/** French text for French users when the category has it, English otherwise */
export function localizeCategory(category: Category, lang: Lang = LANG): LocalizedCategory {
  const english = {
    positiveDescription: category.positiveDescription,
    mixedDescription: category.mixedDescription,
    negativeDescription: category.negativeDescription,
  };
  if (lang !== 'fr') return { title: category.name, subtitle: category.nameFr, ...english };
  return {
    title: category.nameFr || category.name,
    subtitle: category.nameFr ? category.name : undefined,
    positiveDescription: category.positiveDescriptionFr || english.positiveDescription,
    mixedDescription: category.mixedDescriptionFr || english.mixedDescription,
    negativeDescription: category.negativeDescriptionFr || english.negativeDescription,
  };
}

import { Category } from '../types';
import { LANG, Lang } from './i18n';
import { builtInCategories } from '../data/defaultCategories';

export interface LocalizedCategory {
  /** Name in the user's language */
  title: string;
  /** Name in the other language, when there is one */
  subtitle?: string;
  positiveDescription: string;
  mixedDescription: string;
  negativeDescription: string;
}

/** French text for French users when the category (or its built-in twin) has it, English otherwise */
export function localizeCategory(category: Category, lang: Lang = LANG): LocalizedCategory {
  const english = {
    positiveDescription: category.positiveDescription,
    mixedDescription: category.mixedDescription,
    negativeDescription: category.negativeDescription,
  };
  if (lang !== 'fr') return { title: category.name, subtitle: category.nameFr, ...english };
  // Sessions created before the French descriptions existed only stored English ones
  const builtIn = builtInCategories.find((c) => c.name === category.name);
  return {
    title: category.nameFr || category.name,
    subtitle: category.nameFr ? category.name : undefined,
    positiveDescription:
      category.positiveDescriptionFr || builtIn?.positiveDescriptionFr || english.positiveDescription,
    mixedDescription:
      category.mixedDescriptionFr || builtIn?.mixedDescriptionFr || english.mixedDescription,
    negativeDescription:
      category.negativeDescriptionFr || builtIn?.negativeDescriptionFr || english.negativeDescription,
  };
}

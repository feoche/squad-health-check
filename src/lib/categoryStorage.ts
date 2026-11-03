import { Category } from '../types';

/** The category choice of the last session, offered again as the default */
const SELECTED_STORAGE_KEY = 'selectedCategories';
/** Categories removed from the choice, kept among the suggestions */
const REMOVED_STORAGE_KEY = 'removedCategories';

/** Keeps the stored entries that still look like categories, so a corrupted value is ignored */
export function parseStoredCategories(raw: string | null): Category[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return value.filter(
      (c): c is Category => typeof c === 'object' && c !== null && typeof c.name === 'string',
    );
  } catch {
    return null;
  }
}

/* Storage may be missing or blocked: then nothing is remembered past a reload */
function load(key: string): Category[] | null {
  try {
    return parseStoredCategories(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function save(key: string, categories: Category[]) {
  try {
    localStorage.setItem(key, JSON.stringify(categories));
  } catch {
    /* Storage blocked */
  }
}

/** The stored category choice, or null when none was made yet */
export const loadSelectedCategories = () => load(SELECTED_STORAGE_KEY);
export const saveSelectedCategories = (categories: Category[]) => save(SELECTED_STORAGE_KEY, categories);

export const loadRemovedCategories = () => load(REMOVED_STORAGE_KEY) ?? [];
export const saveRemovedCategories = (categories: Category[]) => save(REMOVED_STORAGE_KEY, categories);

/** Forgets the stored choice and removed categories, back to the repo defaults */
export function clearStoredCategories() {
  try {
    localStorage.removeItem(SELECTED_STORAGE_KEY);
    localStorage.removeItem(REMOVED_STORAGE_KEY);
  } catch {
    /* Storage blocked: nothing was stored */
  }
}

/** Whether the facilitator last edited the categories as code, so the code tab opens again */
const CODE_VIEW_STORAGE_KEY = 'categoryCodeView';

export function loadCodeView(): boolean {
  try {
    return localStorage.getItem(CODE_VIEW_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveCodeView(codeView: boolean) {
  try {
    if (codeView) localStorage.setItem(CODE_VIEW_STORAGE_KEY, 'true');
    else localStorage.removeItem(CODE_VIEW_STORAGE_KEY);
  } catch {
    /* Storage blocked */
  }
}

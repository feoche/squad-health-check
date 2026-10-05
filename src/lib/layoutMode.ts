export type LayoutMode = 'compact' | 'full';

export const LAYOUT_KEY = 'shc-facilitator-layout';

/** Narrower windows (a side window next to the shared screen, a phone) default to compact */
export const FULL_LAYOUT_MIN_WIDTH = 768;

export function initialLayout(stored: string | null, width: number): LayoutMode {
  if (stored === 'compact' || stored === 'full') return stored;
  return width >= FULL_LAYOUT_MIN_WIDTH ? 'full' : 'compact';
}

/** Storage can be unavailable (blocked site data, previews): even accessing it may throw. */
export function readStoredLayout(storage: () => Pick<Storage, 'getItem'>): string | null {
  try {
    return storage().getItem(LAYOUT_KEY);
  } catch {
    return null;
  }
}

export function storeLayout(storage: () => Pick<Storage, 'setItem'>, mode: LayoutMode): void {
  try {
    storage().setItem(LAYOUT_KEY, mode);
  } catch {
    /* The choice then lasts for this page only */
  }
}

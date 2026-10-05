import { useSyncExternalStore } from 'react';
import { LANG, subscribeLang } from './i18n';

/** Current UI language; re-renders the caller on every switch */
export function useLang() {
  return useSyncExternalStore(subscribeLang, () => LANG);
}

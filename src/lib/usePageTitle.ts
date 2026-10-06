import { useEffect } from 'react';
import { t } from './i18n';
import { useLang } from './useLang';

/** Names the browser tab after the page (WCAG 2.4.2), and follows language switches */
export function usePageTitle(page?: string) {
  const lang = useLang();
  useEffect(() => {
    document.title = t.pageTitle(page);
  }, [page, lang]);
}

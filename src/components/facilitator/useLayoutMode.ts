import { useCallback, useState } from 'react';
import { LayoutMode, initialLayout, readStoredLayout, storeLayout } from '../../lib/layoutMode';

const storage = () => window.localStorage;

export function useLayoutMode(): [LayoutMode, (mode: LayoutMode) => void] {
  const [mode, setMode] = useState<LayoutMode>(() =>
    initialLayout(readStoredLayout(storage), window.innerWidth),
  );
  const change = useCallback((next: LayoutMode) => {
    setMode(next);
    storeLayout(storage, next);
  }, []);
  return [mode, change];
}

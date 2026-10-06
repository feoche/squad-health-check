import { RefObject, useEffect } from 'react';

/**
 * Focuses the element on mount when focus was dropped on the page body, which happens
 * when the control a keyboard user was on disappears with the view it belonged to.
 */
export function useFocusIfLost(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body) ref.current?.focus();
  }, [ref]);
}

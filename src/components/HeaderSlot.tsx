import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** The element in the app header that pages can render into */
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

/** Renders its children in the app header instead of in place */
function HeaderSlot({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  return slot ? createPortal(children, slot) : null;
}

export default HeaderSlot;

import { createContext } from 'react';

export interface ModalContextType {
  onClose?: () => void;
}

export const ModalContext = createContext<ModalContextType | null>(null);

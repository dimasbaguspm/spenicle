import { createContext } from 'react';

export interface DrawerContextType {
  onClose?: () => void;
}

export const DrawerContext = createContext<DrawerContextType | null>(null);

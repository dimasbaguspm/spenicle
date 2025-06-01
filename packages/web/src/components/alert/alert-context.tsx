import { createContext } from 'react';

export interface AlertContextType {
  onClose?: () => void;
  variant?: string | null;
}

export const AlertContext = createContext<AlertContextType | null>(null);

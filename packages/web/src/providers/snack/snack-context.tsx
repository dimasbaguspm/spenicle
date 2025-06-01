import { createContext, useContext } from 'react';

import { type SnackProps } from '../../components/snack';

export interface SnackItem extends Omit<SnackProps, 'onClose'> {
  id: string;
  message: React.ReactNode;
  duration?: number;
  persistent?: boolean;
}

export interface SnackContextValue {
  snacks: SnackItem[];
  addSnack: (snack: Omit<SnackItem, 'id'>) => string;
  removeSnack: (id: string) => void;
  clearAll: () => void;
}

export const SnackContext = createContext<SnackContextValue | undefined>(undefined);

export function useSnackContext() {
  const context = useContext(SnackContext);
  if (!context) {
    throw new Error('useSnackContext must be used within a SnackProvider');
  }
  return context;
}

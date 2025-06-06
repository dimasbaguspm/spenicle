import { createContext } from 'react';

export interface TabContextType {
  activeTab: string;
  onTabChange: (value: string) => void;
  type: 'underline' | 'tabs' | 'ghost';
  variant?: 'coral' | 'sage' | 'mist' | 'slate' | 'success' | 'info' | 'warning' | 'danger';
}

export const TabContext = createContext<TabContextType | null>(null);

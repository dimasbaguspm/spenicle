import { createContext } from 'react';

export interface TabContextType {
  activeTab: string;
  onTabChange: (value: string) => void;
  variant: 'underline' | 'tabs' | 'ghost';
}

export const TabContext = createContext<TabContextType | null>(null);

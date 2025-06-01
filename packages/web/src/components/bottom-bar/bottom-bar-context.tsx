import { createContext } from 'react';

export interface BottomBarContextType {
  isVisible?: boolean;
  onToggle?: () => void;
  onHide?: () => void;
  onShow?: () => void;
}

export const BottomBarContext = createContext<BottomBarContextType | null>(null);

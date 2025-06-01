import { createContext } from 'react';

export interface TooltipContextType {
  isOpen: boolean;
  onOpenChange: (open: boolean, withDelay?: boolean) => void;
  trigger: React.RefObject<HTMLElement | null>;
  content: React.RefObject<HTMLElement | null>;
  container: React.RefObject<HTMLDivElement | null>;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const TooltipContext = createContext<TooltipContextType | null>(null);

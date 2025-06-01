import { useRef, useState } from 'react';

import { TooltipContent } from './tooltip-content';
import { TooltipContext, type TooltipContextType } from './tooltip-context';
import { TooltipTrigger } from './tooltip-trigger';

export interface TooltipProps {
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

function TooltipRoot({
  children,
  placement = 'top',
  defaultOpen = false,
  onOpenChange,
  delayDuration = 200,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenChange = (open: boolean, withDelay = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (withDelay && open) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
        onOpenChange?.(true);
      }, delayDuration);
    } else if (withDelay && !open) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        onOpenChange?.(false);
      }, 150);
    } else {
      setIsOpen(open);
      onOpenChange?.(open);
    }
  };

  const contextValue: TooltipContextType = {
    isOpen,
    onOpenChange: handleOpenChange,
    trigger: triggerRef,
    content: contentRef,
    container: containerRef,
    placement,
  };

  return (
    <TooltipContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

// Compound component pattern
export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});

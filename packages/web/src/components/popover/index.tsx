import { forwardRef, useEffect, useRef } from 'react';

import { cn } from '../../libs/utils';

export interface PopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose?: () => void;
  trigger?: React.RefObject<HTMLElement | null>;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'bottom' | 'top';
}

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  ({ className, open, onClose, trigger: _trigger, placement: _placement = 'bottom-end', children, ...props }, ref) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const popover = popoverRef.current;
      if (!popover) return;

      if (open) {
        popover.showPopover();

        // Position the popover relative to the trigger
        const trigger = _trigger?.current;
        if (trigger) {
          const triggerRect = trigger.getBoundingClientRect();
          const popoverRect = popover.getBoundingClientRect();

          // Position below and to the right of the trigger
          const left = triggerRect.right - popoverRect.width;
          const top = triggerRect.bottom + 8;

          // Ensure it stays within viewport
          const maxLeft = window.innerWidth - popoverRect.width - 16;
          const maxTop = window.innerHeight - popoverRect.height - 16;

          popover.style.left = `${Math.min(Math.max(left, 16), maxLeft)}px`;
          popover.style.top = `${Math.min(top, maxTop)}px`;
        }
      } else {
        popover.hidePopover();
      }
    }, [open, _trigger]);

    useEffect(() => {
      const popover = popoverRef.current;
      if (!popover) return;

      const handleToggle = (event: Event) => {
        const toggleEvent = event as ToggleEvent;
        if (toggleEvent.newState === 'closed' && onClose) {
          onClose();
        }
      };

      popover.addEventListener('toggle', handleToggle);
      return () => popover.removeEventListener('toggle', handleToggle);
    }, [onClose]);

    const getPlacementClasses = () => {
      // Native popover positioning - let browser handle it
      return '';
    };

    return (
      <div
        ref={(node) => {
          popoverRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        popover="auto"
        className={cn(
          'w-80 rounded-lg bg-white shadow-lg border border-gray-200 p-4',
          'backdrop:bg-black/20',
          getPlacementClasses(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Popover.displayName = 'Popover';

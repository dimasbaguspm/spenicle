import React, { forwardRef, useContext, useEffect, useRef, type HTMLAttributes } from 'react';

import { cn } from '../../libs/utils';

import { TooltipContext } from './tooltip-context';

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export const TooltipTrigger = forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ asChild = false, children, className, ...props }, ref) => {
    const context = useContext(TooltipContext);
    const triggerRef = useRef<HTMLElement | null>(null);

    if (!context) {
      throw new Error('TooltipTrigger must be used within a Tooltip');
    }

    const { onOpenChange } = context;

    useEffect(() => {
      if (triggerRef.current && context.trigger) {
        (context.trigger as React.MutableRefObject<HTMLElement | null>).current = triggerRef.current;
      }
    }, [context.trigger]);

    const handleMouseEnter = () => {
      onOpenChange(true, true);
    };

    const handleMouseLeave = () => {
      onOpenChange(false, true);
    };

    const handleFocus = () => {
      onOpenChange(true, false);
    };

    const handleBlur = () => {
      onOpenChange(false, false);
    };

    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<HTMLAttributes<HTMLElement>>;
      return React.cloneElement(childElement, {
        ...childElement.props,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
        className: cn(childElement.props?.className, className),
        ...props,
      });
    }

    return (
      <span
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') {
            ref(node as HTMLElement);
          } else if (ref && node) {
            ref.current = node;
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn('inline-block', className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

TooltipTrigger.displayName = 'TooltipTrigger';

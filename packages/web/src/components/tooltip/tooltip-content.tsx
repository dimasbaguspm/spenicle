import { cva, type VariantProps } from 'class-variance-authority';
import React, { forwardRef, useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../libs/utils';

import { TooltipContext } from './tooltip-context';

const tooltipContentVariants = cva(
  'z-50 rounded-lg px-3 py-2 text-sm font-medium shadow-lg transition-opacity duration-200 pointer-events-none select-none max-w-xs whitespace-normal break-words',
  {
    variants: {
      variant: {
        // Core color variants following the palette
        default: 'bg-slate-600 text-cream-100 border border-slate-700',
        slate: 'bg-slate-600 text-cream-100 border border-slate-700',
        coral: 'bg-coral-500 text-cream-100 border border-coral-600',
        sage: 'bg-sage-500 text-cream-100 border border-sage-600',
        mist: 'bg-mist-500 text-white border border-mist-600',

        // Light variants with dark text
        light: 'bg-cream-100 text-slate-600 border border-mist-200 shadow-xl',
        'coral-light': 'bg-coral-50 text-coral-700 border border-coral-200',
        'sage-light': 'bg-sage-50 text-sage-700 border border-sage-200',
        'mist-light': 'bg-mist-50 text-mist-700 border border-mist-200',

        // Semantic variants for different contexts
        success: 'bg-success-500 text-white border border-success-600',
        info: 'bg-info-500 text-white border border-info-600',
        warning: 'bg-warning-500 text-white border border-warning-600',
        danger: 'bg-danger-500 text-white border border-danger-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TooltipContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tooltipContentVariants> {
  children: React.ReactNode;
  sideOffset?: number;
}

const calculatePosition = (
  triggerRect: DOMRect,
  contentRect: DOMRect,
  containerRect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right',
  sideOffset: number
) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = 0;
  let y = 0;

  // Calculate initial position based on placement (relative to container)
  const triggerRelativeX = triggerRect.left - containerRect.left;
  const triggerRelativeY = triggerRect.top - containerRect.top;

  switch (placement) {
    case 'top':
      x = triggerRelativeX + (triggerRect.width - contentRect.width) / 2;
      y = triggerRelativeY - contentRect.height - sideOffset;
      break;
    case 'bottom':
      x = triggerRelativeX + (triggerRect.width - contentRect.width) / 2;
      y = triggerRelativeY + triggerRect.height + sideOffset;
      break;
    case 'left':
      x = triggerRelativeX - contentRect.width - sideOffset;
      y = triggerRelativeY + (triggerRect.height - contentRect.height) / 2;
      break;
    case 'right':
      x = triggerRelativeX + triggerRect.width + sideOffset;
      y = triggerRelativeY + (triggerRect.height - contentRect.height) / 2;
      break;
  }

  // Keep tooltip within viewport bounds (considering container position)
  const padding = 8;
  const containerLeft = containerRect.left;
  const containerTop = containerRect.top;

  // Calculate absolute positions for bounds checking
  const absoluteX = containerLeft + x;
  const absoluteY = containerTop + y;

  // Adjust if going outside viewport
  if (absoluteX < padding) {
    x = padding - containerLeft;
  } else if (absoluteX + contentRect.width > viewportWidth - padding) {
    x = viewportWidth - padding - contentRect.width - containerLeft;
  }

  if (absoluteY < padding) {
    y = padding - containerTop;
  } else if (absoluteY + contentRect.height > viewportHeight - padding) {
    y = viewportHeight - padding - contentRect.height - containerTop;
  }

  return { x, y };
};

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, className, variant, sideOffset = 8, ...props }, ref) => {
    const context = useContext(TooltipContext);
    const contentRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);
    const [isPositioned, setIsPositioned] = useState(false);

    if (!context) {
      throw new Error('TooltipContent must be used within a Tooltip');
    }

    const { isOpen, trigger, container, placement = 'top' } = context;

    useLayoutEffect(() => {
      if (contentRef.current && context.content) {
        (context.content as React.MutableRefObject<HTMLDivElement>).current = contentRef.current;
      }
    }, [context.content]);

    useLayoutEffect(() => {
      if (isOpen && trigger?.current && container?.current) {
        // Set visible immediately when tooltip should be open
        setIsVisible(true);
        // Reset positioned state when opening
        setIsPositioned(false);

        // Force a reflow to ensure the content has been rendered with proper dimensions
        const triggerRect = trigger.current.getBoundingClientRect();
        const containerRect = container.current.getBoundingClientRect();

        // Wait for next frame to ensure the tooltip content is fully rendered
        requestAnimationFrame(() => {
          if (contentRef.current) {
            const contentRect = contentRef.current.getBoundingClientRect();

            // Calculate position even if dimensions are 0 initially
            const pos = calculatePosition(triggerRect, contentRect, containerRect, placement, sideOffset);
            setPosition(pos);
            setIsPositioned(true);

            // If dimensions are still 0, try again on next frame
            if (contentRect.width === 0 || contentRect.height === 0) {
              requestAnimationFrame(() => {
                if (contentRef.current) {
                  const retryContentRect = contentRef.current.getBoundingClientRect();
                  const retryPos = calculatePosition(
                    triggerRect,
                    retryContentRect,
                    containerRect,
                    placement,
                    sideOffset
                  );
                  setPosition(retryPos);
                  setIsPositioned(true);
                }
              });
            }
          }
        });
      } else {
        setIsVisible(false);
        setIsPositioned(false);
      }
    }, [isOpen, trigger, container, placement, sideOffset]);

    if (!isOpen) return null;

    const tooltipElement = (
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          tooltipContentVariants({ variant }),
          'absolute',
          isPositioned && isVisible ? 'animate-in fade-in-0 zoom-in-95' : 'animate-out fade-out-0 zoom-out-95',
          className
        )}
        style={{
          left: position.x,
          top: position.y,
          zIndex: 50,
          opacity: isPositioned ? 1 : 0,
          visibility: isPositioned ? 'visible' : 'hidden',
        }}
        role="tooltip"
        {...props}
      >
        {children}
      </div>
    );

    // Render within the container instead of using portal
    if (container?.current) {
      return createPortal(tooltipElement, container.current);
    }

    return null;
  }
);

TooltipContent.displayName = 'TooltipContent';

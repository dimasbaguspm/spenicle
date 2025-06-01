import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useEffect, useRef, useState } from 'react';

import { cn } from '../../libs/utils';

const scrollAreaVariants = cva('relative overflow-hidden', {
  variants: {
    variant: {
      default: 'bg-white',
      secondary: 'bg-sage-50',
      tertiary: 'bg-mist-50',
      ghost: 'bg-transparent',

      // Core color variants
      coral: 'bg-coral-50',
      sage: 'bg-sage-50',
      mist: 'bg-mist-50',
      slate: 'bg-slate-50',
      cream: 'bg-cream-50',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    rounded: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
    rounded: 'md',
  },
});

const scrollbarVariants = cva('absolute z-10 flex touch-none select-none transition-colors', {
  variants: {
    orientation: {
      vertical: 'h-full w-2.5 right-0 top-0 border-l border-l-transparent p-[1px]',
      horizontal: 'w-full h-2.5 bottom-0 left-0 border-t border-t-transparent p-[1px]',
    },
    colorScheme: {
      default: '',
      coral: '',
      sage: '',
      mist: '',
      slate: '',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
    colorScheme: 'default',
  },
});

const scrollbarThumbVariants = cva('relative flex-1 rounded-full transition-colors', {
  variants: {
    colorScheme: {
      default: 'bg-slate-300 hover:bg-slate-400',
      coral: 'bg-coral-300 hover:bg-coral-400',
      sage: 'bg-sage-300 hover:bg-sage-400',
      mist: 'bg-mist-300 hover:bg-mist-400',
      slate: 'bg-slate-400 hover:bg-slate-500',
    },
  },
  defaultVariants: {
    colorScheme: 'default',
  },
});

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof scrollAreaVariants> {
  type?: 'auto' | 'always' | 'scroll' | 'hover';
  scrollHideDelay?: number;
  orientation?: 'vertical' | 'horizontal' | 'both';
  colorScheme?: 'default' | 'coral' | 'sage' | 'mist' | 'slate';
  thumbSize?: 'sm' | 'md' | 'lg';
  smoothScroll?: boolean;
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      children,
      type = 'hover',
      scrollHideDelay = 600,
      orientation = 'vertical',
      colorScheme = 'default',
      thumbSize = 'md',
      smoothScroll = true,
      variant,
      size,
      rounded,
      ...props
    },
    ref
  ) => {
    const [showScrollbar, setShowScrollbar] = useState(type === 'always');
    const [isDragging, setIsDragging] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const verticalThumbRef = useRef<HTMLDivElement>(null);
    const horizontalThumbRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    const showScrollbars = () => {
      if (type === 'hover' || type === 'auto') {
        setShowScrollbar(true);
        clearTimeout(hideTimeoutRef.current);
      }
    };

    const hideScrollbars = () => {
      if (type === 'hover' && !isDragging) {
        hideTimeoutRef.current = setTimeout(() => {
          setShowScrollbar(false);
        }, scrollHideDelay);
      }
    };

    const updateScrollbars = () => {
      const scrollArea = scrollAreaRef.current;
      const content = contentRef.current;
      const verticalThumb = verticalThumbRef.current;
      const horizontalThumb = horizontalThumbRef.current;

      if (!scrollArea || !content) return;

      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = scrollArea;

      // Update vertical scrollbar
      if (verticalThumb && (orientation === 'vertical' || orientation === 'both')) {
        const scrollRatio = scrollTop / (scrollHeight - clientHeight);
        const thumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 20);
        const thumbTop = scrollRatio * (clientHeight - thumbHeight);

        verticalThumb.style.height = `${thumbHeight}px`;
        verticalThumb.style.transform = `translateY(${thumbTop}px)`;
        verticalThumb.style.opacity = scrollHeight > clientHeight ? '1' : '0';
      }

      // Update horizontal scrollbar
      if (horizontalThumb && (orientation === 'horizontal' || orientation === 'both')) {
        const scrollRatio = scrollLeft / (scrollWidth - clientWidth);
        const thumbWidth = Math.max((clientWidth / scrollWidth) * clientWidth, 20);
        const thumbLeft = scrollRatio * (clientWidth - thumbWidth);

        horizontalThumb.style.width = `${thumbWidth}px`;
        horizontalThumb.style.transform = `translateX(${thumbLeft}px)`;
        horizontalThumb.style.opacity = scrollWidth > clientWidth ? '1' : '0';
      }
    };

    const handleScroll = () => {
      updateScrollbars();
      showScrollbars();
      if (type === 'auto') {
        hideScrollbars();
      }
    };

    const handleThumbDrag = (passedOrientation: 'vertical' | 'horizontal', event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);

      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;

      const startPos = passedOrientation === 'vertical' ? event.clientY : event.clientX;
      const startScroll = passedOrientation === 'vertical' ? scrollArea.scrollTop : scrollArea.scrollLeft;

      const handleMouseMove = (e: MouseEvent) => {
        const currentPos = passedOrientation === 'vertical' ? e.clientY : e.clientX;
        const delta = currentPos - startPos;

        if (passedOrientation === 'vertical') {
          const scrollRatio = delta / (scrollArea.clientHeight - 20); // 20 is min thumb height
          const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
          scrollArea.scrollTop = Math.max(0, Math.min(startScroll + scrollRatio * maxScroll, maxScroll));
        } else {
          const scrollRatio = delta / (scrollArea.clientWidth - 20); // 20 is min thumb width
          const maxScroll = scrollArea.scrollWidth - scrollArea.clientWidth;
          scrollArea.scrollLeft = Math.max(0, Math.min(startScroll + scrollRatio * maxScroll, maxScroll));
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (type === 'hover') {
          hideScrollbars();
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;

      // Set up scroll behavior
      if (smoothScroll) {
        scrollArea.style.scrollBehavior = 'smooth';
      }

      // Initial scrollbar update
      updateScrollbars();

      // Set up resize observer to update scrollbars when content changes
      const resizeObserver = new ResizeObserver(updateScrollbars);
      resizeObserver.observe(scrollArea);
      if (contentRef.current) {
        resizeObserver.observe(contentRef.current);
      }

      return () => {
        resizeObserver.disconnect();
        clearTimeout(hideTimeoutRef.current);
      };
    }, [smoothScroll]);

    const scrollAreaClasses = cn(scrollAreaVariants({ variant, size, rounded }), className);

    const contentClasses = cn(
      'h-full w-full',
      orientation === 'vertical' && 'overflow-y-auto overflow-x-hidden',
      orientation === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
      orientation === 'both' && 'overflow-auto',
      // Hide native scrollbars
      '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
    );

    const thumbSizeClasses = {
      sm: 'min-h-[16px] min-w-[16px]',
      md: 'min-h-[20px] min-w-[20px]',
      lg: 'min-h-[24px] min-w-[24px]',
    };

    return (
      <div ref={ref} className={scrollAreaClasses} {...props}>
        <div
          ref={scrollAreaRef}
          className={contentClasses}
          onScroll={handleScroll}
          onMouseEnter={showScrollbars}
          onMouseLeave={hideScrollbars}
        >
          <div ref={contentRef}>{children}</div>
        </div>

        {/* Vertical Scrollbar */}
        {(orientation === 'vertical' || orientation === 'both') && (
          <div
            className={cn(
              scrollbarVariants({ orientation: 'vertical', colorScheme }),
              showScrollbar ? 'opacity-100' : 'opacity-0',
              'transition-opacity duration-150'
            )}
          >
            <div
              ref={verticalThumbRef}
              className={cn(scrollbarThumbVariants({ colorScheme }), thumbSizeClasses[thumbSize], 'cursor-pointer')}
              onMouseDown={(e) => handleThumbDrag('vertical', e)}
            />
          </div>
        )}

        {/* Horizontal Scrollbar */}
        {(orientation === 'horizontal' || orientation === 'both') && (
          <div
            className={cn(
              scrollbarVariants({ orientation: 'horizontal', colorScheme }),
              showScrollbar ? 'opacity-100' : 'opacity-0',
              'transition-opacity duration-150'
            )}
          >
            <div
              ref={horizontalThumbRef}
              className={cn(scrollbarThumbVariants({ colorScheme }), thumbSizeClasses[thumbSize], 'cursor-pointer')}
              onMouseDown={(e) => handleThumbDrag('horizontal', e)}
            />
          </div>
        )}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea, scrollAreaVariants };

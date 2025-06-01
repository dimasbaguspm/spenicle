import React, { useContext, useEffect, useRef, useState } from 'react';

import { cn } from '../../libs/utils';

import { BottomBarContext } from './bottom-bar-context';

export interface BottomBarProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'floating' | 'compact';
  hideOnScroll?: boolean;
  backdrop?: boolean;
  autoHide?: number; // Auto-hide after X seconds
  onVisibilityChange?: (visible: boolean) => void;
}

// Variant configurations
const variantClasses = {
  default: {
    container: 'bottom-0 left-0 right-0',
    content: 'w-full bg-cream-50/95 backdrop-blur-md border-t border-mist-200/80 shadow-sm',
    padding: 'px-4 py-3',
  },
  floating: {
    container: 'bottom-4 left-4 right-4',
    content: 'w-full bg-cream-50/90 backdrop-blur-lg border border-mist-200/70 rounded-2xl shadow-md',
    padding: 'px-6 py-4',
  },
  compact: {
    container: 'bottom-0 left-0 right-0',
    content: 'w-full bg-cream-50/98 backdrop-blur-sm border-t border-mist-200/70 shadow-sm',
    padding: 'px-2 py-1.5',
  },
} as const;

export function BottomBar({
  children,
  className,
  variant = 'default',
  hideOnScroll = false,
  backdrop = false,
  autoHide,
  onVisibilityChange,
}: BottomBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [, setIsAnimating] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeout = useRef<NodeJS.Timeout>(undefined);

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  const handleHide = () => {
    setIsVisible(false);
  };

  const handleShow = () => {
    setIsVisible(true);

    // Reset auto-hide timer if enabled
    if (autoHide) {
      clearTimeout(hideTimeout?.current);
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHide * 1000);
    }
  };

  // Handle scroll-based hiding
  useEffect(() => {
    if (!hideOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;

      if (scrollingDown && currentScrollY > 100) {
        setIsVisible(false);
      } else if (!scrollingDown) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll]);

  // Handle auto-hide
  useEffect(() => {
    if (autoHide && isVisible) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, autoHide * 1000);
    }

    return () => clearTimeout(hideTimeout.current);
  }, [autoHide, isVisible]);

  // Handle visibility change callback
  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  // Handle animation states
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const variantConfig = variantClasses[variant];

  return (
    <div
      className={cn(
        'sticky z-50 transition-all duration-300 ease-in-out',
        variantConfig.container,
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        className
      )}
    >
      {backdrop && (
        <div
          className={cn(
            'absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300',
            isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{ zIndex: -1 }}
        />
      )}

      <div className={cn(variantConfig.content, variantConfig.padding, 'transition-all duration-300 ease-in-out')}>
        <BottomBarContext.Provider
          value={{
            isVisible,
            onToggle: handleToggle,
            onHide: handleHide,
            onShow: handleShow,
          }}
        >
          {children}
        </BottomBarContext.Provider>
      </div>
    </div>
  );
}

export function useBottomBar() {
  const context = useContext(BottomBarContext);
  if (!context) {
    throw new Error('useBottomBar must be used within a BottomBar component');
  }
  return context;
}

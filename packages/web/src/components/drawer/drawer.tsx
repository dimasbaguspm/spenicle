import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { escapeManager } from '../../libs/escape-manager';
import { cn } from '../../libs/utils';

import { DrawerContext } from './drawer-context';

export interface DrawerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'left' | 'right' | 'top' | 'bottom';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayClassName?: string;
  onClose?: () => void;
}

// Size configurations
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

// Position configurations with initial states
const positionClasses = {
  left: {
    container: 'justify-start',
    content: 'h-full',
    animation: {
      enter: 'translate-x-0',
      exit: '-translate-x-full',
      initial: '-translate-x-full',
    },
  },
  right: {
    container: 'justify-end',
    content: 'h-full',
    animation: {
      enter: 'translate-x-0',
      exit: 'translate-x-full',
      initial: 'translate-x-full',
    },
  },
  top: {
    container: 'items-start',
    content: 'w-full',
    animation: {
      enter: 'translate-y-0',
      exit: '-translate-y-full',
      initial: '-translate-y-full',
    },
  },
  bottom: {
    container: 'items-end',
    content: 'w-full',
    animation: {
      enter: 'translate-y-0',
      exit: 'translate-y-full',
      initial: 'translate-y-full',
    },
  },
} as const;

// Drawer Component
export function Drawer({
  children,
  size = 'md',
  position = 'right',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayClassName,
  onClose,
}: DrawerProps) {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const handleClose = () => {
    if (!onClose) return;

    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
      setIsAnimatingOut(false);
      setIsVisible(false);
      setOverlayVisible(false);
    }, 250); // Slightly faster for better responsiveness
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Initialize visibility state with a small delay for smooth entrance
  useEffect(() => {
    // Use requestAnimationFrame to ensure the initial state is rendered first
    const timer = requestAnimationFrame(() => {
      setOverlayVisible(true);
      // Small delay for drawer content to create staggered effect
      setTimeout(() => setIsVisible(true), 50);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (closeOnEscape) {
      // Use escape manager to handle ESC key with proper z-index priority
      const drawerId = `drawer-${Date.now()}-${Math.random()}`;
      const unregister = escapeManager.register(drawerId, 40, handleClose); // z-index 40 for drawers (lower than modals)
      return unregister;
    }
  }, [closeOnEscape]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const positionConfig = positionClasses[position];
  const isVertical = position === 'top' || position === 'bottom';

  return createPortal(
    <DrawerContext.Provider value={{ onClose }}>
      <div
        className={cn(
          'fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm',
          'transition-all duration-200 ease-out',
          positionConfig.container,
          isAnimatingOut ? 'opacity-0' : overlayVisible ? 'opacity-100' : 'opacity-0',
          overlayClassName
        )}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={cn(
            'relative bg-white shadow-lg transform-gpu flex flex-col',
            'transition-all duration-250 ease-out will-change-transform',
            positionConfig.content,
            isVertical ? sizeClasses[size] : sizeClasses[size],
            isVertical ? 'max-h-[80vh]' : 'w-full h-full',
            !isVertical && 'max-w-md',
            isAnimatingOut
              ? positionConfig.animation.exit
              : isVisible
                ? positionConfig.animation.enter
                : positionConfig.animation.initial,
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>,
    document.body
  );
}

// Re-export all drawer components
export { DrawerHeader, type DrawerHeaderProps } from './drawer-header';
export { DrawerTitle, type DrawerTitleProps } from './drawer-title';
export { DrawerDescription, type DrawerDescriptionProps } from './drawer-description';
export { DrawerContent, type DrawerContentProps } from './drawer-content';
export { DrawerFooter, type DrawerFooterProps } from './drawer-footer';
export { DrawerCloseButton, type DrawerCloseButtonProps } from './drawer-close-button';

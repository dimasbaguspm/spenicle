import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { escapeManager } from '../../libs/escape-manager';
import { cn } from '../../libs/utils';

import { ModalContext } from './modal-context';

export interface ModalProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
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

// Modal Component
export function Modal({
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayClassName,
  onClose,
}: ModalProps) {
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
    }, 200); // Animation duration
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
      // Small delay for modal content to create staggered effect
      setTimeout(() => setIsVisible(true), 50);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (closeOnEscape) {
      // Use escape manager to handle ESC key with proper z-index priority
      const modalId = `modal-${Date.now()}-${Math.random()}`;
      const unregister = escapeManager.register(modalId, 50, handleClose); // z-index 50 for modals
      return unregister;
    }
  }, [closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    <ModalContext.Provider value={{ onClose }}>
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
          'transition-all duration-200 ease-out',
          isAnimatingOut ? 'opacity-0' : overlayVisible ? 'opacity-100' : 'opacity-0',
          overlayClassName
        )}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={cn(
            'relative bg-white rounded-lg shadow-lg transform-gpu flex flex-col w-full',
            'transition-all duration-200 ease-out will-change-transform',
            sizeClasses[size],
            'max-h-[90vh]',
            isAnimatingOut ? 'scale-95 opacity-0' : isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  );
}

// Re-export all modal components
export { ModalHeader, type ModalHeaderProps } from './modal-header';
export { ModalTitle, type ModalTitleProps } from './modal-title';
export { ModalDescription, type ModalDescriptionProps } from './modal-description';
export { ModalContent, type ModalContentProps } from './modal-content';
export { ModalFooter, type ModalFooterProps } from './modal-footer';
export { ModalCloseButton, type ModalCloseButtonProps } from './modal-close-button';

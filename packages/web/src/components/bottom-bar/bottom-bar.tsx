import React, { useContext, useEffect, useRef, useState } from 'react';

import { cn } from '../../libs/utils';

import { BottomBarContext } from './bottom-bar-context';
import { validateBottomBarProps, getVariantConfig, detectScrollDirection, sanitizeAutoHideDuration } from './helpers';
import type { BottomBarProps } from './types';

export const BottomBar: React.FC<BottomBarProps> = (props) => {
  const validatedProps = validateBottomBarProps(props);
  const { children, className, hideOnScroll = false, backdrop = false, autoHide, onVisibilityChange } = props;

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

    // reset auto-hide timer if enabled
    const sanitizedDuration = sanitizeAutoHideDuration(autoHide);
    if (sanitizedDuration) {
      clearTimeout(hideTimeout?.current);
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, sanitizedDuration * 1000);
    }
  };

  // handle scroll-based hiding with improved direction detection
  useEffect(() => {
    if (!hideOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDirection = detectScrollDirection(currentScrollY, lastScrollY.current);

      // only hide when scrolling down significantly
      if (scrollDirection === 'down' && currentScrollY > 100) {
        setIsVisible(false);
      } else if (scrollDirection === 'up') {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll]);

  // handle auto-hide with sanitized duration
  useEffect(() => {
    const sanitizedDuration = sanitizeAutoHideDuration(autoHide);
    if (sanitizedDuration && isVisible) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, sanitizedDuration * 1000);
    }

    return () => clearTimeout(hideTimeout.current);
  }, [autoHide, isVisible]);

  // handle visibility change callback
  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  // handle animation states
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [isVisible]);

  const variantConfig = getVariantConfig(validatedProps.validatedVariant);

  return (
    <div
      className={cn(
        'sticky z-50 transition-all duration-300 ease-in-out',
        variantConfig.container,
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        className
      )}
      role="banner"
      aria-hidden={!isVisible}
    >
      {backdrop && (
        <div
          className={cn(
            'absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300',
            isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{ zIndex: -1 }}
          aria-hidden="true"
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
};

export const useBottomBar = () => {
  const context = useContext(BottomBarContext);
  if (!context) {
    throw new Error('useBottomBar must be used within a BottomBar component');
  }
  return context;
};

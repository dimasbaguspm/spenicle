import { useEffect, useRef, useState } from 'react';

/**
 * Viewport state for responsive design following mobile-first principles
 */
export interface ViewportState {
  /** Current window width */
  width: number;
  /** Current window height */
  height: number;
  /** Mobile devices (width <= 768px) - includes phones and small tablets */
  isMobile: boolean;
  /** Tablet devices (width > 768px and <= 1024px) */
  isTablet: boolean;
  /** Desktop devices (width > 1024px) */
  isDesktop: boolean;
}

/**
 * Get current viewport state with mobile-first breakpoints
 * @returns ViewportState with current viewport information
 */
const getViewportState = (): ViewportState => {
  // Handle SSR gracefully
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Mobile-first responsive breakpoints
  const isMobile = width <= 768;
  const isTablet = width > 768 && width <= 1024;
  const isDesktop = width > 1024;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
  };
};

/**
 * Responsive viewport hook with mobile-first design principles
 * Optimized for modal positioning and responsive layouts with debounced updates
 *
 * @param debounceMs - Debounce delay for resize events (default: 150ms)
 * @returns ViewportState with current viewport information
 */
export function useViewport(debounceMs = 150): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(getViewportState);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const abortController = new AbortController();

    const updateViewport = () => {
      // Clear existing timeout to debounce rapid resize events
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setViewport(getViewportState());
      }, debounceMs);
    };

    // Listen to resize events with AbortController
    window.addEventListener('resize', updateViewport, {
      signal: abortController.signal,
      passive: true, // Improve performance for scroll events
    });

    // Initial update (no debounce needed)
    setViewport(getViewportState());

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      abortController.abort();
    };
  }, [debounceMs]);

  return viewport;
}

import dayjs, { type Dayjs } from 'dayjs';
import { useRef, useCallback } from 'react';

interface UseDateIntersectionObserverProps {
  ribbonElement: HTMLElement | null;
  onTopDateChange?: (date: Dayjs) => void;
  isScrollingToDateRef?: React.MutableRefObject<boolean>;
}

interface DateGroupState {
  dateKey: string;
  element: HTMLDivElement;
  rect: DOMRect;
  isVisible: boolean;
  distanceFromRibbon: number;
  isInSweetSpot: boolean;
}

export function useDateIntersectionObserver({
  ribbonElement,
  onTopDateChange,
  isScrollingToDateRef,
}: UseDateIntersectionObserverProps) {
  const dateGroupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastDetectedDateRef = useRef<string | null>(null);

  const getRibbonOffset = useCallback(() => {
    if (!ribbonElement) return 0;
    const rect = ribbonElement.getBoundingClientRect();
    return rect.bottom;
  }, [ribbonElement]);

  const handleIntersection = useCallback(
    (_entries: IntersectionObserverEntry[]) => {
      if (isScrollingToDateRef?.current) return;

      const allElements = Array.from(dateGroupRefs.current.entries());
      if (allElements.length === 0) return;

      const ribbonOffsetPx = getRibbonOffset();

      const currentStates: DateGroupState[] = allElements.map(([dateKey, element]) => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > ribbonOffsetPx;
        const distanceFromRibbon = Math.max(0, rect.top - ribbonOffsetPx);

        return {
          dateKey,
          element,
          rect,
          isVisible,
          distanceFromRibbon,
          isInSweetSpot: rect.top >= 0 && rect.top <= ribbonOffsetPx + 30,
        };
      });

      const visibleStates = currentStates.filter((state) => state.isVisible);

      if (visibleStates.length === 0) return;

      const [bestCandidate] = visibleStates.sort((a, b) => {
        if (a.isInSweetSpot && !b.isInSweetSpot) return -1;
        if (!a.isInSweetSpot && b.isInSweetSpot) return 1;

        if (a.isInSweetSpot && b.isInSweetSpot) {
          return Math.abs(a.rect.top - ribbonOffsetPx) - Math.abs(b.rect.top - ribbonOffsetPx);
        }

        return a.rect.top - b.rect.top;
      });

      if (bestCandidate && bestCandidate.dateKey !== lastDetectedDateRef.current) {
        lastDetectedDateRef.current = bestCandidate.dateKey;
        onTopDateChange?.(dayjs(bestCandidate.dateKey));
      }
    },
    [getRibbonOffset, onTopDateChange, isScrollingToDateRef]
  );

  const initializeObserver = useCallback(() => {
    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (dateGroupRefs.current.size === 0) return;

    const ribbonOffsetPx = getRibbonOffset();
    const topMargin = Math.max(0, ribbonOffsetPx - 10);
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: `-${topMargin}px 0px -40% 0px`,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    dateGroupRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    // Improved scroll handler with better throttling
    let scrollRAF: number | null = null;
    const handleScroll = () => {
      if (scrollRAF) return; // Skip if already scheduled

      scrollRAF = requestAnimationFrame(() => {
        handleIntersection([]);
        scrollRAF = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      window.removeEventListener('scroll', handleScroll);
      if (scrollRAF) {
        cancelAnimationFrame(scrollRAF);
      }
    };
  }, [handleIntersection, getRibbonOffset]);

  const setDateGroupRef = useCallback((dateKey: string) => {
    return (element: HTMLDivElement | null) => {
      if (element) {
        dateGroupRefs.current.set(dateKey, element);
        if (observerRef.current) {
          observerRef.current.observe(element);
        }
      } else {
        dateGroupRefs.current.delete(dateKey);
      }
    };
  }, []);

  const getDateGroupElement = useCallback((dateKey: string) => {
    return dateGroupRefs.current.get(dateKey);
  }, []);

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  return {
    setDateGroupRef,
    getDateGroupElement,
    initializeObserver,
    cleanup,
    lastDetectedDateRef,
  };
}

import { useEffect, useRef } from 'react';

// useDebouncedDistinctEffect: runs effect only when value changes (deep compare) and after debounce
// - value: the value to watch (any type)
// - effect: callback to run when value changes
// - delay: debounce ms (default 300)
export function useDebouncedDistinctEffect<T>(value: T, effect: (val: T) => void, delay = 300) {
  const lastValue = useRef<T | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // deep compare using JSON.stringify (sufficient for simple filter objects)
  const isEqual = (a: T | undefined, b: T | undefined) => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  useEffect(() => {
    if (isEqual(value, lastValue.current)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastValue.current = value;
      effect(value);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, delay]);
}

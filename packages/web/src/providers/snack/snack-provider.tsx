import { useCallback, useState, type ReactNode } from 'react';

import { SnackContainer } from './snack-container';
import { SnackContext, type SnackContextValue, type SnackItem } from './snack-context';

interface SnackProviderProps {
  children: ReactNode;
  /**
   * Maximum number of snacks to show at once
   * @default 5
   */
  maxSnacks?: number;
  /**
   * Default duration for auto-dismissible snacks (in milliseconds)
   * @default 5000
   */
  defaultDuration?: number;
  /**
   * Position of the snack container
   * @default "top-right"
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

export function SnackProvider({
  children,
  maxSnacks = 5,
  defaultDuration = 5000,
  position = 'top-right',
}: SnackProviderProps) {
  const [snacks, setSnacks] = useState<SnackItem[]>([]);

  const addSnack = useCallback(
    (snack: Omit<SnackItem, 'id'>): string => {
      const id = Math.random().toString(36).substring(2, 9);
      const newSnack: SnackItem = {
        ...snack,
        id,
        duration: snack.duration ?? defaultDuration,
      };

      setSnacks((current) => {
        const updated = [...current, newSnack];
        // Remove oldest snacks if we exceed the maximum
        return updated.slice(-maxSnacks);
      });

      // Auto-remove the snack after the specified duration (unless persistent)
      if (!newSnack.persistent && (newSnack?.duration ?? 0) > 0) {
        setTimeout(() => {
          removeSnack(id);
        }, newSnack.duration);
      }

      return id;
    },
    [defaultDuration, maxSnacks]
  );

  const removeSnack = useCallback((id: string) => {
    setSnacks((current) => current.filter((snack) => snack.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSnacks([]);
  }, []);

  const contextValue: SnackContextValue = {
    snacks,
    addSnack,
    removeSnack,
    clearAll,
  };

  return (
    <SnackContext.Provider value={contextValue}>
      {children}
      <SnackContainer snacks={snacks} onRemove={removeSnack} position={position} />
    </SnackContext.Provider>
  );
}

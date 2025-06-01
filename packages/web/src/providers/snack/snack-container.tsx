import { useEffect, useState } from 'react';

import { Snack } from '../../components/snack';
import { cn } from '../../libs/utils';

import { type SnackItem } from './snack-context';

interface SnackContainerProps {
  snacks: SnackItem[];
  onRemove: (id: string) => void;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

interface SnackItemWithVisibility extends SnackItem {
  isVisible: boolean;
  isRemoving: boolean;
}

export function SnackContainer({ snacks, onRemove, position }: SnackContainerProps) {
  const [visibleSnacks, setVisibleSnacks] = useState<SnackItemWithVisibility[]>([]);

  useEffect(() => {
    setVisibleSnacks((current) => {
      const newSnackIds = snacks.map((s) => s.id);
      const currentSnackIds = current.map((s) => s.id);

      // Mark snacks for removal if they're not in the new list
      const updated = current.map((snack) => ({
        ...snack,
        isRemoving: !newSnackIds.includes(snack.id),
      }));

      // Add new snacks
      const newSnacks = snacks
        .filter((snack) => !currentSnackIds.includes(snack.id))
        .map((snack) => ({
          ...snack,
          isVisible: false,
          isRemoving: false,
        }));

      const result = [...updated, ...newSnacks];

      // Trigger visibility for new snacks after a brief delay
      setTimeout(() => {
        setVisibleSnacks((prev) =>
          prev.map((snack) => ({
            ...snack,
            isVisible: !snack.isRemoving,
          }))
        );
      }, 10);

      return result;
    });
  }, [snacks]);

  // Remove snacks after animation completes
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    visibleSnacks.forEach((snack) => {
      if (snack.isRemoving) {
        const timeout = setTimeout(() => {
          setVisibleSnacks((current) => current.filter((s) => s.id !== snack.id));
        }, 200); // Match animation duration
        timeouts.push(timeout);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [visibleSnacks]);

  if (visibleSnacks.length === 0) return null;

  const isTop = position.includes('top');

  return (
    <div
      className={cn('fixed z-[9999] flex flex-col gap-2 pointer-events-none', positionClasses[position], {
        'flex-col': isTop,
        'flex-col-reverse': !isTop,
      })}
      style={{ maxWidth: 'min(400px, calc(100vw - 2rem))' }}
    >
      {visibleSnacks.map((snack) => {
        const { id, message, isVisible, isRemoving, ...snackProps } = snack;
        return (
          <div
            key={id}
            className={cn('pointer-events-auto w-full transition-all duration-200 ease-in-out', {
              'opacity-100 scale-100 translate-y-0': isVisible && !isRemoving,
              'opacity-0 scale-95': !isVisible || isRemoving,
              '-translate-y-2': !isVisible && isTop,
              'translate-y-2': !isVisible && !isTop,
            })}
          >
            <Snack {...snackProps} onClose={snack.persistent ? undefined : () => onRemove(id)} className="w-full">
              {message}
            </Snack>
          </div>
        );
      })}
    </div>
  );
}

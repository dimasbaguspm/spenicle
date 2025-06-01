import { forwardRef, type ReactNode } from 'react';

interface TileProps {
  children: ReactNode;
  className?: string;
}

export const Tile = forwardRef<HTMLDivElement, TileProps>(({ children, className = '' }, ref) => {
  return (
    <div ref={ref} className={`bg-cream-50 rounded-lg border border-mist-200 overflow-hidden ${className}`}>
      {children}
    </div>
  );
});

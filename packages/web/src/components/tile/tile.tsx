import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';

interface TileProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Tile = forwardRef<HTMLDivElement, TileProps>(({ children, className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`bg-white rounded-lg border border-mist-200 ${className}`} {...props}>
      {children}
    </div>
  );
});

import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

import { AvatarFallback } from './components/avatar-fallback';
import { AvatarImage } from './components/avatar-image';
import { generateInitials } from './helpers';
import type { AvatarProps } from './types';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-14 w-14',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// compound component interface for type safety
interface AvatarComposition {
  Image: typeof AvatarImage;
  Fallback: typeof AvatarFallback;
}

const AvatarBase = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', src, alt, fallback, loading = 'lazy', color = 'coral', ...props }, ref) => {
    return (
      <div ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
        {/* render image if src is provided */}
        {src && <AvatarImage src={src} alt={alt ?? 'Avatar'} loading={loading} />}

        {/* always render fallback - it will show when image fails to load or is not provided */}
        <AvatarFallback color={color} size={size}>
          {fallback ? generateInitials(fallback) : '?'}
        </AvatarFallback>
      </div>
    );
  }
);

// create compound component with subcomponents attached
export const Avatar = Object.assign(AvatarBase, {
  Image: AvatarImage,
  Fallback: AvatarFallback,
} satisfies AvatarComposition);

// export variants for external use if needed
export { avatarVariants };

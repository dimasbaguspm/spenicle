import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
      '2xl': 'h-20 w-20',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const avatarImageVariants = cva('aspect-square h-full w-full object-cover');

const avatarFallbackVariants = cva(
  'flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 font-medium select-none',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
        xl: 'text-lg',
        '2xl': 'text-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  loading?: 'eager' | 'lazy';
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, loading = 'lazy', ...props }, ref) => {
    const getInitials = (name?: string) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const displayFallback = fallback ? getInitials(fallback) : '?';

    return (
      <div ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
        {src ? (
          <img
            src={src}
            alt={alt ?? 'Avatar'}
            loading={loading}
            className={cn(avatarImageVariants())}
            onError={(e) => {
              // Hide the image if it fails to load, showing fallback
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className={cn(avatarFallbackVariants({ size }))}>{displayFallback}</div>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };

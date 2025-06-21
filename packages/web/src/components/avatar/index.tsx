import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

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

const avatarImageVariants = cva('aspect-square h-full w-full object-cover');

const avatarFallbackVariants = cva('flex h-full w-full items-center justify-center font-medium select-none', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const paletteBgMap = {
  coral: 'bg-coral-100',
  sage: 'bg-sage-100',
  mist: 'bg-mist-100',
  slate: 'bg-slate-100',
  cream: 'bg-cream-100',
};

const paletteTextMap = {
  coral: 'text-coral-700', // strong contrast for coral bg
  sage: 'text-sage-700',
  mist: 'text-mist-700',
  slate: 'text-slate-700',
  cream: 'text-slate-700', // slate text for cream bg for best contrast
};

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  loading?: 'eager' | 'lazy';
  color?: 'coral' | 'sage' | 'mist' | 'slate' | 'cream';
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, loading = 'lazy', color = 'coral', ...props }, ref) => {
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
        <div className={cn(avatarFallbackVariants({ size }), paletteBgMap[color], paletteTextMap[color])}>
          {displayFallback}
        </div>
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };

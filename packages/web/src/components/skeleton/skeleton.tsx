import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const skeletonVariants = cva('animate-pulse rounded-md bg-gradient-to-r bg-200% transition-all duration-300', {
  variants: {
    variant: {
      default: 'from-mist-100 via-mist-200 to-mist-100',
      secondary: 'from-sage-100 via-sage-200 to-sage-100',
      tertiary: 'from-slate-100 via-slate-200 to-slate-100',
      ghost: 'from-cream-100 via-cream-200 to-cream-100',

      // Core color variants
      coral: 'from-coral-100 via-coral-200 to-coral-100',
      sage: 'from-sage-100 via-sage-200 to-sage-100',
      mist: 'from-mist-100 via-mist-200 to-mist-100',
      slate: 'from-slate-100 via-slate-200 to-slate-100',
      cream: 'from-cream-100 via-cream-200 to-cream-100',

      // Semantic variants for log levels
      success: 'from-success-100 via-success-200 to-success-100',
      info: 'from-info-100 via-info-200 to-info-100',
      warning: 'from-warning-100 via-warning-200 to-warning-100',
      danger: 'from-danger-100 via-danger-200 to-danger-100',

      // Legacy error variants (kept for backward compatibility)
      error: 'from-danger-100 via-danger-200 to-danger-100',
    },
    shape: {
      rectangle: 'rounded-md',
      square: 'rounded-md aspect-square',
      circle: 'rounded-full aspect-square',
      pill: 'rounded-full',
      text: 'rounded-sm h-4',
      avatar: 'rounded-full aspect-square',
      button: 'rounded-lg',
      card: 'rounded-xl',
    },
    size: {
      xs: 'h-3',
      sm: 'h-4',
      md: 'h-6',
      lg: 'h-8',
      xl: 'h-12',
      '2xl': 'h-16',
      '3xl': 'h-20',
      '4xl': 'h-24',
      full: 'h-full w-full',
    },
    width: {
      auto: 'w-auto',
      xs: 'w-12',
      sm: 'w-16',
      md: 'w-24',
      lg: 'w-32',
      xl: 'w-48',
      '2xl': 'w-64',
      '3xl': 'w-80',
      '4xl': 'w-96',
      '1/4': 'w-1/4',
      '1/3': 'w-1/3',
      '1/2': 'w-1/2',
      '2/3': 'w-2/3',
      '3/4': 'w-3/4',
      full: 'w-full',
    },
  },
  defaultVariants: {
    variant: 'default',
    shape: 'rectangle',
    size: 'md',
    width: 'full',
  },
});

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {
  animated?: boolean;
  shimmer?: boolean;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, shape, size, width, animated = true, shimmer = true, ...props }, ref) => {
    return (
      <div
        className={cn(
          skeletonVariants({ variant, shape, size, width }),
          {
            'animate-pulse': animated,
            'bg-gradient-to-r animate-[shimmer_2s_ease-in-out_infinite]': shimmer && animated,
          },
          className
        )}
        ref={ref}
        {...props}
        style={{
          ...props.style,
          backgroundSize: shimmer ? '200% 100%' : undefined,
          animation: shimmer && animated ? 'shimmer 2s ease-in-out infinite' : undefined,
        }}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Compound components for common patterns
const SkeletonAvatar = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'shape'>>(({ size = 'lg', ...props }, ref) => (
  <Skeleton ref={ref} shape="avatar" size={size} width="auto" {...props} />
));

SkeletonAvatar.displayName = 'SkeletonAvatar';

const SkeletonText = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'shape' | 'size'>>(
  ({ width = 'full', ...props }, ref) => <Skeleton ref={ref} shape="text" size="sm" width={width} {...props} />
);

SkeletonText.displayName = 'SkeletonText';

const SkeletonButton = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'shape'>>(
  ({ size = 'md', width = 'md', ...props }, ref) => (
    <Skeleton ref={ref} shape="button" size={size} width={width} {...props} />
  )
);

SkeletonButton.displayName = 'SkeletonButton';

const SkeletonCard = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'shape'>>(
  ({ size = 'xl', width = 'full', ...props }, ref) => (
    <Skeleton ref={ref} shape="card" size={size} width={width} {...props} />
  )
);

SkeletonCard.displayName = 'SkeletonCard';

export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonButton, SkeletonCard, skeletonVariants };

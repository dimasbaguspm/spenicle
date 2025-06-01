import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useEffect, useState } from 'react';

import { cn } from '../../libs/utils';

const radialProgressVariants = cva(
  'relative inline-flex items-center justify-center rounded-full transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'text-coral-600',
        secondary: 'text-sage-600',
        tertiary: 'text-mist-600',
        ghost: 'text-slate-600',

        // Core color variants
        coral: 'text-coral-600',
        sage: 'text-sage-600',
        mist: 'text-mist-600',
        slate: 'text-slate-600',

        // Semantic variants for log levels
        success: 'text-success-600',
        info: 'text-info-600',
        warning: 'text-warning-600',
        danger: 'text-danger-600',

        // Legacy error variants (kept for backward compatibility)
        error: 'text-danger-600',
      },
      size: {
        sm: 'w-12 h-12 text-xs',
        md: 'w-16 h-16 text-sm',
        lg: 'w-20 h-20 text-base',
        xl: 'w-24 h-24 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const getProgressColor = (variant: string | null | undefined) => {
  switch (variant) {
    case 'coral':
    case 'default':
      return '#e07a5f';
    case 'sage':
    case 'secondary':
      return '#81b29a';
    case 'mist':
    case 'tertiary':
      return '#84a5c0';
    case 'slate':
    case 'ghost':
      return '#3d405b';
    case 'success':
      return '#6db285';
    case 'info':
      return '#6b8fad';
    case 'warning':
      return '#e08a47';
    case 'danger':
    case 'error':
      return '#e06650';
    default:
      return '#e07a5f';
  }
};

const getTrackColor = (variant: string | null | undefined) => {
  switch (variant) {
    case 'coral':
    case 'default':
      return '#fef5f2';
    case 'sage':
    case 'secondary':
      return '#f0f7f3';
    case 'mist':
    case 'tertiary':
      return '#f1f5f9';
    case 'slate':
    case 'ghost':
      return '#f8fafc';
    case 'success':
      return '#f0f7f3';
    case 'info':
      return '#f1f5f9';
    case 'warning':
      return '#fef5f2';
    case 'danger':
    case 'error':
      return '#fef5f2';
    default:
      return '#fef5f2';
  }
};

export interface RadialProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof radialProgressVariants> {
  value: number;
  max?: number;
  showValue?: boolean;
  animated?: boolean;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const RadialProgress = forwardRef<HTMLDivElement, RadialProgressProps>(
  (
    {
      className,
      variant,
      size,
      value,
      max = 100,
      showValue = true,
      animated = true,
      strokeWidth = 4,
      children,
      ...props
    },
    ref
  ) => {
    const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value);

    useEffect(() => {
      if (animated) {
        const timer = setTimeout(() => {
          setAnimatedValue(value);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        setAnimatedValue(value);
      }
    }, [value, animated]);

    const percentage = Math.min(Math.max((animatedValue / max) * 100, 0), 100);
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const progressColor = getProgressColor(variant);
    const trackColor = getTrackColor(variant);

    return (
      <div className={cn(radialProgressVariants({ variant, size, className }))} ref={ref} {...props}>
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 50 50">
          {/* Background track */}
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn('transition-all duration-1000 ease-out', animated && 'animate-in')}
            style={{
              transition: animated ? 'stroke-dashoffset 1000ms ease-out' : 'none',
            }}
          />
        </svg>
        <div className="relative z-10 flex items-center justify-center">
          {children ?? (showValue && <span className="font-medium">{Math.round(percentage)}%</span>)}
        </div>
      </div>
    );
  }
);

RadialProgress.displayName = 'RadialProgress';

export { RadialProgress, radialProgressVariants };

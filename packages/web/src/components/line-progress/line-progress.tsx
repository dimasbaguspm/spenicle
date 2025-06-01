import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useEffect, useState } from 'react';

import { cn } from '../../libs/utils';

const lineProgressVariants = cva('relative w-full overflow-hidden rounded-full transition-all duration-300', {
  variants: {
    variant: {
      default: 'bg-coral-50',
      secondary: 'bg-sage-50',
      tertiary: 'bg-mist-50',
      ghost: 'bg-slate-50',

      // Core color variants
      coral: 'bg-coral-50',
      sage: 'bg-sage-50',
      mist: 'bg-mist-50',
      slate: 'bg-slate-50',

      // Semantic variants for log levels
      success: 'bg-success-50',
      info: 'bg-info-50',
      warning: 'bg-warning-50',
      danger: 'bg-danger-50',

      // Legacy error variants (kept for backward compatibility)
      error: 'bg-danger-50',
    },
    size: {
      xs: 'h-1',
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
      xl: 'h-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const getProgressColor = (variant: string | null | undefined) => {
  switch (variant) {
    case 'coral':
    case 'default':
      return 'bg-coral-500';
    case 'sage':
    case 'secondary':
      return 'bg-sage-500';
    case 'mist':
    case 'tertiary':
      return 'bg-mist-500';
    case 'slate':
    case 'ghost':
      return 'bg-slate-500';
    case 'success':
      return 'bg-success-500';
    case 'info':
      return 'bg-info-500';
    case 'warning':
      return 'bg-warning-500';
    case 'danger':
    case 'error':
      return 'bg-danger-500';
    default:
      return 'bg-coral-500';
  }
};

const getProgressGlowColor = (variant: string | null | undefined) => {
  switch (variant) {
    case 'coral':
    case 'default':
      return 'shadow-coral-200';
    case 'sage':
    case 'secondary':
      return 'shadow-sage-200';
    case 'mist':
    case 'tertiary':
      return 'shadow-mist-200';
    case 'slate':
    case 'ghost':
      return 'shadow-slate-200';
    case 'success':
      return 'shadow-success-200';
    case 'info':
      return 'shadow-info-200';
    case 'warning':
      return 'shadow-warning-200';
    case 'danger':
    case 'error':
      return 'shadow-danger-200';
    default:
      return 'shadow-coral-200';
  }
};

export interface LineProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof lineProgressVariants> {
  value: number;
  max?: number;
  showValue?: boolean;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  indeterminate?: boolean;
  children?: React.ReactNode;
}

const LineProgress = forwardRef<HTMLDivElement, LineProgressProps>(
  (
    {
      className,
      variant,
      size,
      value,
      max = 100,
      showValue = false,
      showLabel = false,
      label,
      animated = true,
      striped = false,
      indeterminate = false,
      children,
      ...props
    },
    ref
  ) => {
    const [animatedValue, setAnimatedValue] = useState(animated ? 0 : value);

    useEffect(() => {
      if (animated && !indeterminate) {
        const timer = setTimeout(() => {
          setAnimatedValue(value);
        }, 100);
        return () => clearTimeout(timer);
      } else if (!indeterminate) {
        setAnimatedValue(value);
      }
    }, [value, animated, indeterminate]);

    const percentage = indeterminate ? 100 : Math.min(Math.max((animatedValue / max) * 100, 0), 100);
    const progressColor = getProgressColor(variant);
    const glowColor = getProgressGlowColor(variant);

    const progressBarClasses = cn(
      'h-full rounded-full transition-all duration-1000 ease-out',
      progressColor,
      striped && 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:1rem_100%]',
      indeterminate && 'animate-pulse',
      size === 'xl' && `shadow-sm ${glowColor}`
    );

    return (
      <div className="w-full space-y-2" ref={ref} {...props}>
        {/* Label and Value */}
        {(showLabel || showValue) && (
          <div className="flex justify-between items-center text-sm">
            {showLabel && <span className="text-slate-600 font-medium">{label ?? `Progress`}</span>}
            {showValue && !indeterminate && (
              <span className="text-slate-500 font-medium">{Math.round(percentage)}%</span>
            )}
          </div>
        )}

        {/* Progress Bar Container */}
        <div className={cn(lineProgressVariants({ variant, size, className }))}>
          {/* Progress Bar Fill */}
          <div
            className={progressBarClasses}
            style={{
              width: indeterminate ? '100%' : `${percentage}%`,
              transition: animated && !indeterminate ? 'width 1000ms ease-out' : 'none',
            }}
          >
            {/* Striped Animation */}
            {striped && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:1rem_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
            )}
          </div>

          {/* Indeterminate Animation */}
          {indeterminate && (
            <div
              className={cn(
                'absolute inset-0 h-full rounded-full animate-[indeterminate_2s_ease-in-out_infinite]',
                progressColor,
                'opacity-60'
              )}
              style={{
                background: `linear-gradient(90deg, transparent, currentColor, transparent)`,
                animation: 'indeterminate 2s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Custom Content */}
        {children && <div className="flex justify-center items-center text-sm text-slate-600 mt-2">{children}</div>}
      </div>
    );
  }
);

LineProgress.displayName = 'LineProgress';

export { LineProgress, lineProgressVariants };

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const bottomBarIconButtonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 relative',
  {
    variants: {
      variant: {
        // Primary (Coral) - Active/selected state
        coral: 'bg-coral-500 text-white hover:bg-coral-600 focus:ring-coral-300 active:bg-coral-700 shadow-sm',
        'coral-outline':
          'border border-coral-300 bg-transparent text-coral-600 hover:bg-coral-50 focus:ring-coral-300 active:bg-coral-100',
        'coral-ghost': 'text-coral-600 hover:bg-coral-50 focus:ring-coral-300 active:bg-coral-100',

        // Secondary (Sage) - Important secondary actions
        sage: 'bg-sage-500 text-white hover:bg-sage-600 focus:ring-sage-300 active:bg-sage-700 shadow-sm',
        'sage-outline':
          'border border-sage-300 bg-transparent text-sage-600 hover:bg-sage-50 focus:ring-sage-300 active:bg-sage-100',
        'sage-ghost': 'text-sage-600 hover:bg-sage-50 focus:ring-sage-300 active:bg-sage-100',

        // Tertiary (Mist) - Subtle supporting actions
        mist: 'bg-mist-500 text-white hover:bg-mist-600 focus:ring-mist-300 active:bg-mist-700 shadow-sm',
        'mist-outline':
          'border border-mist-300 bg-transparent text-mist-600 hover:bg-mist-50 focus:ring-mist-300 active:bg-mist-100',
        'mist-ghost': 'text-mist-600 hover:bg-mist-50/80 focus:ring-mist-300 active:bg-mist-100',

        // Ghost/Default (Slate) - Minimal, professional default state
        slate: 'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-300 active:bg-slate-800 shadow-sm',
        'slate-outline':
          'border border-slate-300 bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-300 active:bg-slate-100',
        'slate-ghost':
          'text-slate-600 hover:bg-slate-50/80 focus:ring-slate-300 active:bg-slate-100 hover:text-slate-700',

        // Semantic variants
        success:
          'bg-success-500 text-white hover:bg-success-600 focus:ring-success-300 active:bg-success-700 shadow-sm',
        'success-outline':
          'border border-success-300 bg-transparent text-success-600 hover:bg-success-50 focus:ring-success-300 active:bg-success-100',
        'success-ghost': 'text-success-600 hover:bg-success-50 focus:ring-success-300 active:bg-success-100',

        info: 'bg-info-500 text-white hover:bg-info-600 focus:ring-info-300 active:bg-info-700 shadow-sm',
        'info-outline':
          'border border-info-300 bg-transparent text-info-600 hover:bg-info-50 focus:ring-info-300 active:bg-info-100',
        'info-ghost': 'text-info-600 hover:bg-info-50 focus:ring-info-300 active:bg-info-100',

        warning:
          'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-300 active:bg-warning-700 shadow-sm',
        'warning-outline':
          'border border-warning-300 bg-transparent text-warning-600 hover:bg-warning-50 focus:ring-warning-300 active:bg-warning-100',
        'warning-ghost': 'text-warning-600 hover:bg-warning-50 focus:ring-warning-300 active:bg-warning-100',

        danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-300 active:bg-danger-700 shadow-sm',
        'danger-outline':
          'border border-danger-300 bg-transparent text-danger-600 hover:bg-danger-50 focus:ring-danger-300 active:bg-danger-100',
        'danger-ghost': 'text-danger-600 hover:bg-danger-50 focus:ring-danger-300 active:bg-danger-100',
      },
      size: {
        xs: 'h-8 w-8 text-sm min-w-[2rem]',
        sm: 'h-9 w-9 text-sm min-w-[2.25rem]',
        md: 'h-11 w-11 text-base min-w-[2.75rem]',
        lg: 'h-12 w-12 text-lg min-w-[3rem]',
        xl: 'h-14 w-14 text-xl min-w-[3.5rem]',
      },
      rounded: {
        true: 'rounded-full',
        false: 'rounded-lg',
      },
      withBadge: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'slate-ghost',
      size: 'md',
      rounded: true,
      withBadge: false,
    },
  }
);

export interface BottomBarIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof bottomBarIconButtonVariants> {
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'coral' | 'sage' | 'danger' | 'warning' | 'info' | 'success';
  tooltip?: string;
}

export const BottomBarIconButton = forwardRef<HTMLButtonElement, BottomBarIconButtonProps>(
  (
    { className, variant, size, rounded, withBadge, icon, badge, badgeVariant = 'coral', tooltip, onClick, ...props },
    ref
  ) => {
    const getBadgeColor = (selectedVariant: string) => {
      const colors = {
        coral: 'bg-coral-500 text-white',
        sage: 'bg-sage-500 text-white',
        danger: 'bg-danger-500 text-white',
        warning: 'bg-warning-500 text-white',
        info: 'bg-info-500 text-white',
        success: 'bg-success-500 text-white',
      };
      return colors[selectedVariant as keyof typeof colors] || colors.coral;
    };

    return (
      <button
        ref={ref}
        className={cn(bottomBarIconButtonVariants({ variant, size, rounded, withBadge }), className)}
        onClick={onClick}
        title={tooltip}
        {...props}
      >
        {icon}

        {badge && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center text-xs font-semibold rounded-full px-1',
              getBadgeColor(badgeVariant)
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }
);

BottomBarIconButton.displayName = 'BottomBarIconButton';

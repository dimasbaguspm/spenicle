import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // solid palette
        coral: 'bg-coral-600 text-white hover:bg-coral-700 focus:ring-coral-500',
        sage: 'bg-sage-600 text-white hover:bg-sage-700 focus:ring-sage-500',
        mist: 'bg-mist-600 text-white hover:bg-mist-700 focus:ring-mist-500',
        slate: 'bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-500',
        cream: 'bg-cream-200 text-slate-900 hover:bg-cream-300 focus:ring-cream-400',
        // outline palette
        'coral-outline': 'border border-coral-300 bg-white text-coral-700 hover:bg-coral-50 focus:ring-coral-500',
        'sage-outline': 'border border-sage-300 bg-white text-sage-700 hover:bg-sage-50 focus:ring-sage-500',
        'mist-outline': 'border border-mist-300 bg-white text-mist-700 hover:bg-mist-50 focus:ring-mist-500',
        'slate-outline': 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
        'cream-outline': 'border border-cream-300 bg-white text-slate-700 hover:bg-cream-50 focus:ring-cream-400',
        // ghost palette
        'coral-ghost': 'text-coral-700 hover:bg-coral-50 focus:ring-coral-500',
        'sage-ghost': 'text-sage-700 hover:bg-sage-50 focus:ring-sage-500',
        'mist-ghost': 'text-mist-700 hover:bg-mist-50 focus:ring-mist-500',
        'slate-ghost': 'text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
        'cream-ghost': 'text-slate-700 hover:bg-cream-50 focus:ring-cream-400',
        // legacy/defaults
        default: 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-600',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-600',
        ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-600',
        error: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        'error-outline': 'border border-red-300 bg-white text-red-600 hover:bg-red-50 focus:ring-red-500',
        'error-ghost': 'text-red-600 hover:bg-red-50 focus:ring-red-500',
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-14 w-14',
      },
      rounded: {
        true: 'rounded-full',
        false: 'rounded',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: false,
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  children: React.ReactNode;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, rounded, children, ...props }, ref) => {
    return (
      <button className={cn(iconButtonVariants({ variant, size, rounded, className }))} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };

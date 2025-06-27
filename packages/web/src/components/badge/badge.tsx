import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

import { BadgeContent } from './components/badge-content';
import { BadgeIcon } from './components/badge-icon';
import { getSemanticType, getAccessibleLabel, validateBadgeProps } from './helpers';
import type { BadgeProps } from './types';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-coral-500 text-cream-100 focus:ring-coral-300',
        secondary: 'bg-sage-500 text-cream-100 focus:ring-sage-300',
        tertiary: 'bg-mist-500 text-white focus:ring-mist-300',
        outline: 'border border-slate-300 bg-transparent text-slate-600 focus:ring-slate-300',
        ghost: 'bg-slate-100 text-slate-600 focus:ring-slate-300',

        // core color variants
        coral: 'bg-coral-500 text-cream-100 focus:ring-coral-300',
        'coral-outline': 'border border-coral-300 bg-transparent text-coral-600 focus:ring-coral-300',
        'coral-ghost': 'bg-coral-50 text-coral-600 focus:ring-coral-300',
        sage: 'bg-sage-500 text-cream-100 focus:ring-sage-300',
        'sage-outline': 'border border-sage-300 bg-transparent text-sage-600 focus:ring-sage-300',
        'sage-ghost': 'bg-sage-50 text-sage-600 focus:ring-sage-300',
        mist: 'bg-mist-500 text-white focus:ring-mist-300',
        'mist-outline': 'border border-mist-300 bg-transparent text-mist-600 focus:ring-mist-300',
        'mist-ghost': 'bg-mist-50 text-mist-600 focus:ring-mist-300',
        slate: 'bg-slate-100 text-slate-600 focus:ring-slate-300',
        'slate-outline': 'border border-slate-300 bg-transparent text-slate-600 focus:ring-slate-300',
        'slate-ghost': 'bg-slate-50 text-slate-600 focus:ring-slate-300',

        // semantic variants for log levels
        success: 'bg-success-500 text-white focus:ring-success-300',
        'success-outline': 'border border-success-300 bg-transparent text-success-600 focus:ring-success-300',
        'success-ghost': 'bg-success-50 text-success-600 focus:ring-success-300',

        info: 'bg-info-500 text-white focus:ring-info-300',
        'info-outline': 'border border-info-300 bg-transparent text-info-600 focus:ring-info-300',
        'info-ghost': 'bg-info-50 text-info-600 focus:ring-info-300',

        warning: 'bg-warning-500 text-white focus:ring-warning-300',
        'warning-outline': 'border border-warning-300 bg-transparent text-warning-600 focus:ring-warning-300',
        'warning-ghost': 'bg-warning-50 text-warning-600 focus:ring-warning-300',

        danger: 'bg-danger-500 text-white focus:ring-danger-300',
        'danger-outline': 'border border-danger-300 bg-transparent text-danger-600 focus:ring-danger-300',
        'danger-ghost': 'bg-danger-50 text-danger-600 focus:ring-danger-300',

        // legacy error variants (kept for backward compatibility)
        error: 'bg-danger-500 text-white focus:ring-danger-300',
        'error-outline': 'border border-danger-300 bg-white text-danger-600 focus:ring-danger-300',
        'error-ghost': 'bg-danger-50 text-danger-600 focus:ring-danger-300',
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
        xl: 'h-8 px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// compound component interface for type safety
interface BadgeComposition {
  Icon: typeof BadgeIcon;
  Content: typeof BadgeContent;
}

const BadgeBase = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, size, children, ...props }, ref) => {
  // validate and sanitize props for security
  const { validatedVariant, validatedSize, sanitizedContent } = validateBadgeProps({
    variant,
    size,
    content: children,
  });

  // get semantic information for accessibility
  const semanticType = getSemanticType(validatedVariant);
  const accessibleLabel = getAccessibleLabel(semanticType, sanitizedContent);

  return (
    <span
      className={cn(badgeVariants({ variant: validatedVariant, size: validatedSize }), className)}
      ref={ref}
      role="status"
      aria-label={accessibleLabel}
      {...props}
    >
      {sanitizedContent}
    </span>
  );
});

BadgeBase.displayName = 'Badge';

// create compound component with subcomponents attached
export const Badge = Object.assign(BadgeBase, {
  Icon: BadgeIcon,
  Content: BadgeContent,
} satisfies BadgeComposition);

// export variants for external use if needed
export { badgeVariants };

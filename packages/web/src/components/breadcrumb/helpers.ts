import { cva } from 'class-variance-authority';

import { cn } from '../../libs/utils';

/**
 * breadcrumb component variants using CVA for consistent styling
 */
export const breadcrumbVariants = cva('flex items-center space-x-1', {
  variants: {
    variant: {
      mist: 'text-mist-600',
      slate: 'text-slate-600',
      sage: 'text-sage-600',
    },
  },
  defaultVariants: {
    variant: 'mist',
  },
});

/**
 * breadcrumb link variants for interactive elements
 */
export const breadcrumbLinkVariants = cva('transition-colors hover:underline', {
  variants: {
    variant: {
      mist: 'text-mist-600 hover:text-mist-700',
      slate: 'text-slate-600 hover:text-slate-700',
      sage: 'text-sage-600 hover:text-sage-700',
    },
  },
  defaultVariants: {
    variant: 'mist',
  },
});

/**
 * breadcrumb page variants for current page styling
 */
export const breadcrumbPageVariants = cva('font-medium cursor-default', {
  variants: {
    variant: {
      mist: 'text-mist-800',
      slate: 'text-slate-800',
      sage: 'text-sage-800',
    },
  },
  defaultVariants: {
    variant: 'mist',
  },
});

/**
 * breadcrumb separator variants
 */
export const breadcrumbSeparatorVariants = cva('mx-2 select-none', {
  variants: {
    variant: {
      mist: 'text-mist-400',
      slate: 'text-slate-400',
      sage: 'text-sage-400',
    },
  },
  defaultVariants: {
    variant: 'mist',
  },
});

/**
 * utility function to combine classes consistently
 */
export const combineClasses = cn;

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const pageLayoutFooterVariants = cva('w-full flex-shrink-0', {
  variants: {
    sticky: {
      true: 'sticky bottom-0 z-40',
      false: '',
    },
    shadow: {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
    },
    background: {
      inherit: '',
      white: 'bg-white',
      coral: 'bg-coral-50',
      sage: 'bg-sage-50',
      mist: 'bg-mist-50',
      slate: 'bg-slate-50',
      cream: 'bg-cream-50',
    },
  },
  defaultVariants: {
    sticky: false,
    shadow: 'none',
    background: 'inherit',
  },
});

export interface PageLayoutFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageLayoutFooterVariants> {}

const PageLayoutFooter = forwardRef<HTMLDivElement, PageLayoutFooterProps>(
  ({ className, sticky, shadow, background, children, ...props }, ref) => {
    return (
      <footer ref={ref} className={cn(pageLayoutFooterVariants({ sticky, shadow, background }), className)} {...props}>
        {children}
      </footer>
    );
  }
);

export { PageLayoutFooter, pageLayoutFooterVariants };

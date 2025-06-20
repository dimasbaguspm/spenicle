import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const pageLayoutHeaderVariants = cva('w-full flex-shrink-0', {
  variants: {
    sticky: {
      true: 'sticky top-0 z-40',
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

export interface PageLayoutHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageLayoutHeaderVariants> {}

const PageLayoutHeader = forwardRef<HTMLDivElement, PageLayoutHeaderProps>(
  ({ className, sticky, shadow, background, children, ...props }, ref) => {
    return (
      <header ref={ref} className={cn(pageLayoutHeaderVariants({ sticky, shadow, background }), className)} {...props}>
        {children}
      </header>
    );
  }
);

export { PageLayoutHeader, pageLayoutHeaderVariants };

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const pageLayoutMainVariants = cva('relative w-full flex-1 flex flex-col', {
  variants: {
    padding: {
      none: '',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
    overflow: {
      visible: 'overflow-visible',
      hidden: 'overflow-hidden',
      auto: 'overflow-auto',
      scroll: 'overflow-scroll',
    },
  },
  defaultVariants: {
    padding: 'none',
    overflow: 'visible',
  },
});

export interface PageLayoutMainProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageLayoutMainVariants> {}

const PageLayoutMain = forwardRef<HTMLDivElement, PageLayoutMainProps>(
  ({ className, padding, overflow, children, ...props }, ref) => {
    return (
      <main ref={ref} className={cn(pageLayoutMainVariants({ padding, overflow }), className)} {...props}>
        {children}
      </main>
    );
  }
);

export { PageLayoutMain, pageLayoutMainVariants };

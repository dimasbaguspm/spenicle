import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const formLayoutVariants = cva('grid gap-4', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    },
    gap: {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    columns: 2,
    gap: 'md',
  },
});

export interface FormLayoutProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof formLayoutVariants> {
  title?: string;
  titleClassName?: string;
}

export const FormLayout = forwardRef<HTMLDivElement, FormLayoutProps>(
  ({ className, columns, gap, title, titleClassName, children, ...props }, ref) => {
    return (
      <div className="space-y-4">
        {title && <h2 className={cn('text-xl font-semibold text-slate-700 mb-4', titleClassName)}>{title}</h2>}
        <div ref={ref} className={cn(formLayoutVariants({ columns, gap }), className)} {...props}>
          {children}
        </div>
      </div>
    );
  }
);

FormLayout.displayName = 'FormLayout';

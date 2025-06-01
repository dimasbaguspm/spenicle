import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const formLayoutTitleVariants = cva('space-y-4', {
  variants: {
    spacing: {
      sm: 'space-y-2 w-full',
      md: 'space-y-4 w-full',
      lg: 'space-y-6 w-full',
      xl: 'space-y-8 w-full',
    },
    span: {
      1: 'col-span-1',
      2: 'col-span-1 md:col-span-2',
      3: 'col-span-1 md:col-span-3',
      4: 'col-span-1 md:col-span-2 lg:col-span-4',
      6: 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-6',
      full: 'col-span-full',
    },
  },
  defaultVariants: {
    spacing: 'md',
    span: 'full',
  },
});

const formLayoutTitleTextVariants = cva('font-semibold text-slate-700 border-b border-slate-200 pb-2', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface FormLayoutTitleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formLayoutTitleVariants> {
  title: string;
  titleSize?: VariantProps<typeof formLayoutTitleTextVariants>['size'];
  titleClassName?: string;
}

export const FormLayoutTitle = forwardRef<HTMLDivElement, FormLayoutTitleProps>(
  ({ className, spacing, span, title, titleSize, titleClassName, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(formLayoutTitleVariants({ spacing, span }), className)} {...props}>
        <h3 className={cn(formLayoutTitleTextVariants({ size: titleSize }), titleClassName)}>{title}</h3>
      </div>
    );
  }
);

FormLayoutTitle.displayName = 'FormLayoutTitle';

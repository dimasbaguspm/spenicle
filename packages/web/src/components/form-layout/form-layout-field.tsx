import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const formLayoutFieldVariants = cva('', {
  variants: {
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
    span: 1,
  },
});

export interface FormLayoutFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formLayoutFieldVariants> {}

export const FormLayoutField = forwardRef<HTMLDivElement, FormLayoutFieldProps>(
  ({ className, span, ...props }, ref) => {
    return <div ref={ref} className={cn(formLayoutFieldVariants({ span }), className)} {...props} />;
  }
);

FormLayoutField.displayName = 'FormLayoutField';

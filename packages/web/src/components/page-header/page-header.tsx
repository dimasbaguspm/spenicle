import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';
import { BackButton, type BackButtonProps } from '../back-button';

const pageHeaderVariants = cva('flex items-center gap-3 mb-6', {
  variants: {
    variant: {
      default: 'px-0',
      padded: 'px-4',
    },
    size: {
      sm: 'gap-2 mb-4',
      md: 'gap-3 mb-6',
      lg: 'gap-4 mb-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const pageTitleVariants = cva('font-bold text-slate-900 leading-tight', {
  variants: {
    size: {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageHeaderVariants> {
  /** Page title to display */
  title: string;
  /** Show/hide back button */
  showBackButton?: boolean;
  /** Back button configuration */
  backButton?: Partial<BackButtonProps>;
  /** Additional content to show on the right side */
  rightContent?: React.ReactNode;
  /** Custom title size override */
  titleSize?: VariantProps<typeof pageTitleVariants>['size'];
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, showBackButton = false, backButton, rightContent, variant, size, titleSize, ...props }, ref) => {
    const actualTitleSize = titleSize ?? size;

    return (
      <div ref={ref} className={cn(pageHeaderVariants({ variant, size }), className)} {...props}>
        {/* Back Button */}
        {showBackButton && <BackButton variant="ghost" size="md" {...backButton} />}

        {/* Title */}
        <h1 className={cn(pageTitleVariants({ size: actualTitleSize }), 'flex-1')}>{title}</h1>

        {/* Right Content */}
        {rightContent && <div className="flex items-center gap-2 flex-shrink-0">{rightContent}</div>}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

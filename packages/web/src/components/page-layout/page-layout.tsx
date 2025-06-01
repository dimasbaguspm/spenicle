import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';
import { PageHeader, type PageHeaderProps } from '../page-header';

const pageLayoutVariants = cva('w-full flex flex-col', {
  variants: {
    minHeight: {
      screen: 'min-h-screen',
      viewport: 'min-h-[100vh]',
      full: 'h-screen',
      auto: 'min-h-0',
    },
    padding: {
      none: '',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },
    background: {
      none: '',
      white: 'bg-white',
      coral: 'bg-coral-50',
      sage: 'bg-sage-50',
      mist: 'bg-mist-50',
      slate: 'bg-slate-50',
      cream: 'bg-cream-50',
    },
    maxWidth: {
      none: '',
      sm: 'max-w-sm mx-auto',
      md: 'max-w-md mx-auto',
      lg: 'max-w-lg mx-auto',
      xl: 'max-w-xl mx-auto',
      '2xl': 'max-w-2xl mx-auto',
      '3xl': 'max-w-3xl mx-auto',
      '4xl': 'max-w-4xl mx-auto',
      '5xl': 'max-w-5xl mx-auto',
      '6xl': 'max-w-6xl mx-auto',
      '7xl': 'max-w-7xl mx-auto',
      full: 'max-w-full',
    },
  },
  defaultVariants: {
    minHeight: 'viewport',
    padding: 'none',
    background: 'none',
    maxWidth: 'none',
  },
});

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

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageLayoutVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  headerProps?: PageLayoutHeaderProps;
  mainProps?: PageLayoutMainProps;
  footerProps?: PageLayoutFooterProps;
  /** Page title - when provided, will show a PageHeader with back button and title */
  title?: string;
  /** Show back button in header */
  showBackButton?: boolean;
  /** Page header configuration */
  pageHeaderProps?: Partial<PageHeaderProps>;
  /** Content to show on the right side of the page header */
  rightContent?: React.ReactNode;
}

export interface PageLayoutHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageLayoutHeaderVariants> {}

export interface PageLayoutMainProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageLayoutMainVariants> {}

export interface PageLayoutFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageLayoutFooterVariants> {}

const PageLayoutHeader = forwardRef<HTMLDivElement, PageLayoutHeaderProps>(
  ({ className, sticky, shadow, background, children, ...props }, ref) => {
    return (
      <header ref={ref} className={cn(pageLayoutHeaderVariants({ sticky, shadow, background }), className)} {...props}>
        {children}
      </header>
    );
  }
);

PageLayoutHeader.displayName = 'PageLayoutHeader';

const PageLayoutMain = forwardRef<HTMLDivElement, PageLayoutMainProps>(
  ({ className, padding, overflow, children, ...props }, ref) => {
    return (
      <main ref={ref} className={cn(pageLayoutMainVariants({ padding, overflow }), className)} {...props}>
        {children}
      </main>
    );
  }
);

PageLayoutMain.displayName = 'PageLayoutMain';

const PageLayoutFooter = forwardRef<HTMLDivElement, PageLayoutFooterProps>(
  ({ className, sticky, shadow, background, children, ...props }, ref) => {
    return (
      <footer ref={ref} className={cn(pageLayoutFooterVariants({ sticky, shadow, background }), className)} {...props}>
        {children}
      </footer>
    );
  }
);

PageLayoutFooter.displayName = 'PageLayoutFooter';

export const PageLayout = forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    {
      className,
      minHeight,
      padding,
      background,
      maxWidth,
      header,
      footer,
      headerProps,
      mainProps,
      footerProps,
      title,
      showBackButton = false,
      pageHeaderProps,
      rightContent,
      children,
      ...props
    },
    ref
  ) => {
    // Set default padding if title is provided and no mainProps padding is set
    const defaultMainProps = title && !mainProps?.padding ? { padding: 'md' as const, ...mainProps } : mainProps;

    return (
      <div
        ref={ref}
        className={cn(pageLayoutVariants({ minHeight, padding, background, maxWidth }), className)}
        {...props}
      >
        {header && <PageLayoutHeader {...headerProps}>{header}</PageLayoutHeader>}

        <PageLayoutMain {...defaultMainProps}>
          {title && (
            <PageHeader
              title={title}
              showBackButton={showBackButton}
              rightContent={rightContent}
              {...pageHeaderProps}
            />
          )}
          {children}
        </PageLayoutMain>

        {footer && <PageLayoutFooter {...footerProps}>{footer}</PageLayoutFooter>}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';

// Export sub-components for composable usage
export { PageLayoutHeader, PageLayoutMain, PageLayoutFooter, pageLayoutVariants };

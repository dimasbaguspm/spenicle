import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { useViewport } from '../../hooks';
import { cn } from '../../libs/utils';
import { PageHeader, type PageHeaderProps } from '../page-header';

import { PageLayoutFooter } from './page-layout-footer';
import { PageLayoutHeader } from './page-layout-header';
import { PageLayoutMain } from './page-layout-main';

const pageLayoutVariants = cva('w-full flex flex-col', {
  variants: {
    minHeight: {
      screen: 'min-h-screen',
      viewport: '',
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

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageLayoutVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  headerProps?: React.ComponentProps<typeof PageLayoutHeader>;
  mainProps?: React.ComponentProps<typeof PageLayoutMain>;
  footerProps?: React.ComponentProps<typeof PageLayoutFooter>;
  /** Page title - when provided, will show a PageHeader with back button and title */
  title?: string;
  /** Show back button in header */
  showBackButton?: boolean;
  /** Page header configuration */
  pageHeaderProps?: Partial<PageHeaderProps>;
  /** Content to show on the right side of the page header */
  rightContent?: React.ReactNode;
}

export const PageLayout = forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    {
      className,
      minHeight,
      padding,
      background,
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
    const { isDesktop } = useViewport();
    const defaultMainProps = title && !mainProps?.padding ? { padding: 'md' as const, ...mainProps } : mainProps;

    return (
      <div
        ref={ref}
        className={cn(
          pageLayoutVariants({ minHeight, padding, background, maxWidth: isDesktop ? 'none' : 'lg' }),
          className
        )}
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

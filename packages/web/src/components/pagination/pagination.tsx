import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const paginationVariants = cva('flex items-center justify-center space-x-1', {
  variants: {
    variant: {
      default: '',
      compact: 'space-x-0.5',
      spaced: 'space-x-2',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const paginationItemVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'rounded-md',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
      colorScheme: {
        // Default uses coral (primary color)
        default:
          'text-slate-600 hover:text-coral-700 hover:bg-coral-50 focus:ring-coral-300 data-[active=true]:bg-coral-500 data-[active=true]:text-white data-[active=true]:shadow-sm',

        // Secondary uses sage
        secondary:
          'text-slate-600 hover:text-sage-700 hover:bg-sage-50 focus:ring-sage-300 data-[active=true]:bg-sage-500 data-[active=true]:text-white data-[active=true]:shadow-sm',

        // Tertiary uses mist
        tertiary:
          'text-slate-600 hover:text-mist-700 hover:bg-mist-50 focus:ring-mist-300 data-[active=true]:bg-mist-500 data-[active=true]:text-white data-[active=true]:shadow-sm',

        // Ghost uses slate
        ghost:
          'text-slate-600 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-300 data-[active=true]:bg-slate-100 data-[active=true]:text-slate-900',

        // Outline variant
        outline:
          'border border-slate-300 text-slate-600 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-300 data-[active=true]:bg-slate-500 data-[active=true]:text-white data-[active=true]:border-slate-500',

        // Core color variants
        coral:
          'text-slate-600 hover:text-coral-700 hover:bg-coral-50 focus:ring-coral-300 data-[active=true]:bg-coral-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        sage: 'text-slate-600 hover:text-sage-700 hover:bg-sage-50 focus:ring-sage-300 data-[active=true]:bg-sage-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        mist: 'text-slate-600 hover:text-mist-700 hover:bg-mist-50 focus:ring-mist-300 data-[active=true]:bg-mist-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        slate:
          'text-slate-600 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-300 data-[active=true]:bg-slate-500 data-[active=true]:text-white data-[active=true]:shadow-sm',

        // Semantic variants
        success:
          'text-slate-600 hover:text-success-700 hover:bg-success-50 focus:ring-success-300 data-[active=true]:bg-success-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        info: 'text-slate-600 hover:text-info-700 hover:bg-info-50 focus:ring-info-300 data-[active=true]:bg-info-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        warning:
          'text-slate-600 hover:text-warning-700 hover:bg-warning-50 focus:ring-warning-300 data-[active=true]:bg-warning-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        danger:
          'text-slate-600 hover:text-danger-700 hover:bg-danger-50 focus:ring-danger-300 data-[active=true]:bg-danger-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
      },
      size: {
        sm: 'h-7 min-w-[28px] px-2 text-xs',
        md: 'h-9 min-w-[36px] px-3 text-sm',
        lg: 'h-11 min-w-[44px] px-4 text-base',
        xl: 'h-13 min-w-[52px] px-5 text-lg',
      },
      itemType: {
        page: '',
        nav: 'font-semibold',
        ellipsis: 'cursor-default pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      colorScheme: 'default',
      size: 'md',
      itemType: 'page',
    },
  }
);

const paginationNavVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'rounded-md',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
      colorScheme: {
        default:
          'text-slate-600 hover:text-coral-700 hover:bg-coral-50 focus:ring-coral-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        secondary:
          'text-slate-600 hover:text-sage-700 hover:bg-sage-50 focus:ring-sage-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        tertiary:
          'text-slate-600 hover:text-mist-700 hover:bg-mist-50 focus:ring-mist-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        ghost:
          'text-slate-600 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        outline:
          'border border-slate-300 text-slate-600 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-300 disabled:text-slate-400 disabled:border-slate-200 disabled:hover:bg-transparent',

        // Core color variants
        coral:
          'text-slate-600 hover:text-coral-700 hover:bg-coral-50 focus:ring-coral-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        sage: 'text-slate-600 hover:text-sage-700 hover:bg-sage-50 focus:ring-sage-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        mist: 'text-slate-600 hover:text-mist-700 hover:bg-mist-50 focus:ring-mist-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        slate:
          'text-slate-600 hover:text-slate-700 hover:bg-slate-50 focus:ring-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent',

        // Semantic variants
        success:
          'text-slate-600 hover:text-success-700 hover:bg-success-50 focus:ring-success-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        info: 'text-slate-600 hover:text-info-700 hover:bg-info-50 focus:ring-info-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        warning:
          'text-slate-600 hover:text-warning-700 hover:bg-warning-50 focus:ring-warning-300 disabled:text-slate-400 disabled:hover:bg-transparent',
        danger:
          'text-slate-600 hover:text-danger-700 hover:bg-danger-50 focus:ring-danger-300 disabled:text-slate-400 disabled:hover:bg-transparent',
      },
      size: {
        sm: 'h-7 px-2 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
        xl: 'h-13 px-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      colorScheme: 'default',
      size: 'md',
    },
  }
);

export interface PaginationProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'>,
    VariantProps<typeof paginationVariants> {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  colorScheme?: ColorScheme;
  itemVariant?: ShapeVariant;
  disabled?: boolean;
  labels?: {
    first?: string;
    last?: string;
    previous?: string;
    next?: string;
    page?: (page: number) => string;
  };
}

type ColorScheme =
  | 'default'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'outline'
  | 'coral'
  | 'sage'
  | 'mist'
  | 'slate'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger';

type SizeVariant = 'sm' | 'md' | 'lg' | 'xl';
type ShapeVariant = 'default' | 'pill' | 'square';

interface PaginationItemProps {
  page: number;
  isActive?: boolean;
  onClick?: (page: number) => void;
  disabled?: boolean;
  colorScheme?: ColorScheme;
  variant?: ShapeVariant;
  size?: SizeVariant;
  children?: React.ReactNode;
  type?: 'page' | 'nav' | 'ellipsis';
}

const PaginationItem = ({
  page,
  isActive = false,
  onClick,
  disabled = false,
  colorScheme = 'default',
  variant = 'default',
  size = 'md',
  children,
  type = 'page',
}: PaginationItemProps) => {
  const handleClick = () => {
    if (!disabled && onClick && type !== 'ellipsis') {
      onClick(page);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick && type !== 'ellipsis') {
      e.preventDefault();
      onClick(page);
    }
  };

  if (type === 'ellipsis') {
    return (
      <span
        className={cn(
          paginationItemVariants({
            variant: variant,
            colorScheme: colorScheme,
            size: size,
            itemType: 'ellipsis',
          })
        )}
      >
        {children ?? '…'}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      data-active={isActive}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        paginationItemVariants({
          variant: variant,
          colorScheme: colorScheme,
          size: size,
          itemType: type,
        })
      )}
    >
      {children ?? page}
    </button>
  );
};

interface PaginationNavProps {
  direction: 'first' | 'previous' | 'next' | 'last';
  onClick?: () => void;
  disabled?: boolean;
  colorScheme?: ColorScheme;
  variant?: ShapeVariant;
  size?: SizeVariant;
  children?: React.ReactNode;
}

const PaginationNav = ({
  direction,
  onClick,
  disabled = false,
  colorScheme = 'default',
  variant = 'default',
  size = 'md',
  children,
}: PaginationNavProps) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const defaultIcons = {
    first: '⟪',
    previous: '⟨',
    next: '⟩',
    last: '⟫',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        paginationNavVariants({
          variant: variant,
          colorScheme: colorScheme,
          size: size,
        })
      )}
      aria-label={`Go to ${direction} page`}
    >
      {children ?? defaultIcons[direction]}
    </button>
  );
};

const generatePageNumbers = (currentPage: number, totalPages: number, siblingCount: number = 1) => {
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipsis

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
    return [firstPageIndex, 'ellipsis', ...rightRange];
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [firstPageIndex, 'ellipsis', ...middleRange, 'ellipsis', lastPageIndex];
  }

  return [];
};

const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      variant,
      size = 'md',
      currentPage,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showFirstLast = false,
      showPrevNext = true,
      colorScheme = 'default',
      itemVariant = 'default',
      disabled = false,
      labels = {},
      ...props
    },
    ref
  ) => {
    const pageNumbers = generatePageNumbers(currentPage, totalPages, siblingCount);

    // Ensure size is never null
    const actualSize: SizeVariant = size ?? 'md';

    const handlePageChange = (page: number) => {
      if (page !== currentPage && page >= 1 && page <= totalPages && !disabled) {
        onPageChange?.(page);
      }
    };

    const defaultLabels = {
      first: 'First',
      last: 'Last',
      previous: 'Previous',
      next: 'Next',
      page: (page: number) => `Page ${page}`,
      ...labels,
    };

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label="Pagination"
        className={cn(paginationVariants({ variant, size: actualSize }), className)}
        {...props}
      >
        {/* First Page */}
        {showFirstLast && (
          <PaginationNav
            direction="first"
            onClick={() => handlePageChange(1)}
            disabled={disabled || currentPage === 1}
            colorScheme={colorScheme}
            variant={itemVariant}
            size={actualSize}
          >
            {defaultLabels.first}
          </PaginationNav>
        )}

        {/* Previous Page */}
        {showPrevNext && (
          <PaginationNav
            direction="previous"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            colorScheme={colorScheme}
            variant={itemVariant}
            size={actualSize}
          >
            {defaultLabels.previous}
          </PaginationNav>
        )}

        {/* Page Numbers */}
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <PaginationItem
                key={`ellipsis-${index}`}
                page={0}
                colorScheme={colorScheme}
                variant={itemVariant}
                size={actualSize}
                type="ellipsis"
              />
            );
          }

          return (
            <PaginationItem
              key={page}
              page={page as number}
              isActive={page === currentPage}
              onClick={handlePageChange}
              disabled={disabled}
              colorScheme={colorScheme}
              variant={itemVariant}
              size={actualSize}
              type="page"
            />
          );
        })}

        {/* Next Page */}
        {showPrevNext && (
          <PaginationNav
            direction="next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            colorScheme={colorScheme}
            variant={itemVariant}
            size={actualSize}
          >
            {defaultLabels.next}
          </PaginationNav>
        )}

        {/* Last Page */}
        {showFirstLast && (
          <PaginationNav
            direction="last"
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled || currentPage === totalPages}
            colorScheme={colorScheme}
            variant={itemVariant}
            size={actualSize}
          >
            {defaultLabels.last}
          </PaginationNav>
        )}
      </nav>
    );
  }
);

Pagination.displayName = 'Pagination';

export { Pagination, paginationVariants, paginationItemVariants, paginationNavVariants };

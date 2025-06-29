import { useLocation, useRouter, useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useCallback, useMemo, useEffect } from 'react';

export type PeriodType = 'weekly' | 'monthly' | 'yearly';
export type PanelType = 'period' | 'categories' | 'accounts';

export interface SearchFilters {
  query: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  accounts?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
}

// URL search parameters interface - only startDate/endDate for period state
export interface AnalyticsSearchParams {
  // primary date range state
  startDate?: string;
  endDate?: string;

  // search and filter parameters
  query?: string;
  categories?: string[];
  accounts?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface SummaryFiltersState {
  // panel navigation state
  selectedPanel: PanelType;

  // search and filter state
  searchFilters: SearchFilters;

  // computed period values (only expose these to consumers)
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
  periodStartDate: Date;
  periodEndDate: Date;
}

/**
 * Internal interface for period controls - used by period selector component
 * This provides period navigation while keeping implementation details hidden
 */
export interface InternalPeriodControls {
  currentPeriodType: PeriodType;
  setPeriodType: (type: PeriodType) => void;
  navigatePeriod: (direction: 'prev' | 'next') => void;
  goToCurrentPeriod: () => void;
}

export interface SummaryFiltersActions {
  // panel navigation actions
  setSelectedPanel: (panel: PanelType) => void;
  navigateToPanel: (panel: PanelType) => Promise<void>;

  // search and filter actions
  updateSearchQuery: (query: string) => void;
  updateDateRange: (range: { start: Date; end: Date } | undefined) => void;
  updateCategoryFilter: (categories: string[]) => void;
  updateAccountFilter: (accounts: string[]) => void;
  updateAmountRange: (range: { min: number; max: number } | undefined) => void;
  clearAllFilters: () => void;

  // period navigation actions (works with start/end dates)
  navigatePeriod: (direction: 'prev' | 'next') => void;
  resetToCurrentPeriod: () => void;
}

/**
 * Custom hook for managing desktop summary filters and period selection state.
 * Uses URL search parameters for state persistence with only startDate/endDate.
 * Handles period navigation, panel selection, search filters, and route synchronization.
 */
export const useDesktopSummaryFilters = () => {
  const router = useRouter();
  const location = useLocation();
  const searchParams = useSearch({ strict: false });

  // derive active panel from current route
  const getActivePanelFromRoute = useCallback((): PanelType => {
    const path = location.pathname;
    if (path.includes('/period-breakdown')) return 'period';
    if (path.includes('/categories')) return 'categories';
    if (path.includes('/accounts')) return 'accounts';
    return 'period';
  }, [location.pathname]);

  // helper to update URL search parameters
  const updateSearchParams = useCallback(
    (updates: Partial<AnalyticsSearchParams>) => {
      const currentSearch = (searchParams ?? {}) as AnalyticsSearchParams;
      const newSearch = { ...currentSearch, ...updates };

      // remove undefined values to keep URL clean
      Object.keys(newSearch).forEach((key) => {
        if (newSearch[key as keyof AnalyticsSearchParams] === undefined) {
          delete newSearch[key as keyof AnalyticsSearchParams];
        }
      });

      void router.navigate({
        to: location.pathname,
        search: newSearch as Record<string, unknown>,
        replace: true, // replace to avoid cluttering history
      });
    },
    [router, searchParams, location.pathname]
  );

  // parse period dates from URL or default to current month
  const { periodStartDate, periodEndDate, shouldUpdateUrl } = useMemo(() => {
    const params = (searchParams ?? {}) as AnalyticsSearchParams;
    const now = dayjs();

    if (params.startDate && params.endDate) {
      return {
        periodStartDate: dayjs(params.startDate).toDate(),
        periodEndDate: dayjs(params.endDate).toDate(),
        shouldUpdateUrl: false,
      };
    } else {
      // default to current month and mark for URL update
      const startOfMonth = now.startOf('month');
      return {
        periodStartDate: startOfMonth.toDate(),
        periodEndDate: startOfMonth.endOf('month').toDate(),
        shouldUpdateUrl: true,
      };
    }
  }, [searchParams]);

  // automatically sync default dates to URL on initial render
  // UX benefit: ensures URLs are always shareable and meaningful, even on first visit
  useEffect(() => {
    if (shouldUpdateUrl) {
      updateSearchParams({
        startDate: dayjs(periodStartDate).format('YYYY-MM-DD'),
        endDate: dayjs(periodEndDate).format('YYYY-MM-DD'),
      });
    }
  }, [shouldUpdateUrl, periodStartDate, periodEndDate, updateSearchParams]);

  // derive current period type from date range
  const currentPeriodType = useMemo((): PeriodType => {
    const start = dayjs(periodStartDate);
    const end = dayjs(periodEndDate);
    const daysDiff = end.diff(start, 'days');

    if (daysDiff <= 7) return 'weekly';
    if (daysDiff <= 32) return 'monthly';
    return 'yearly';
  }, [periodStartDate, periodEndDate]);

  // check if current period is the active period (current month/week/year)
  const isCurrentPeriod = useMemo(() => {
    const now = dayjs();
    const start = dayjs(periodStartDate);

    switch (currentPeriodType) {
      case 'weekly':
        return start.isSame(now, 'week');
      case 'monthly':
        return start.isSame(now, 'month');
      case 'yearly':
        return start.isSame(now, 'year');
      default:
        return false;
    }
  }, [periodStartDate, currentPeriodType]);

  // format period display string
  const currentPeriodDisplay = useMemo(() => {
    const start = dayjs(periodStartDate);
    const end = dayjs(periodEndDate);

    switch (currentPeriodType) {
      case 'weekly': {
        if (start.year() !== end.year()) {
          return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
        }

        return `${start.format('MMM D')} - ${end.format('MMM D')}`;
      }

      case 'monthly':
        return start.format('MMMM YYYY');

      case 'yearly':
        return start.format('YYYY');

      default:
        return `${start.format('MMM D')} - ${end.format('MMM D')}`;
    }
  }, [periodStartDate, periodEndDate, currentPeriodType]);

  const selectedPanel: PanelType = getActivePanelFromRoute();

  // construct search filters from URL parameters
  const searchFilters: SearchFilters = useMemo(() => {
    const params = (searchParams ?? {}) as AnalyticsSearchParams;
    const filters: SearchFilters = {
      query: params.query ?? '',
    };

    // parse date range from URL strings
    if (params.startDate && params.endDate) {
      filters.dateRange = {
        start: new Date(params.startDate),
        end: new Date(params.endDate),
      };
    }

    // parse categories array
    if (params.categories?.length) {
      filters.categories = params.categories;
    }

    // parse accounts array
    if (params.accounts?.length) {
      filters.accounts = params.accounts;
    }

    // parse amount range
    if (params.minAmount !== undefined && params.maxAmount !== undefined) {
      filters.amountRange = {
        min: params.minAmount,
        max: params.maxAmount,
      };
    }

    return filters;
  }, [searchParams]);

  // helper to get period boundaries for navigation
  const getPeriodBoundaries = useCallback((type: PeriodType, referenceDate: Date): { start: Date; end: Date } => {
    const date = dayjs(referenceDate);

    switch (type) {
      case 'weekly':
        return {
          start: date.startOf('week').toDate(),
          end: date.endOf('week').toDate(),
        };
      case 'monthly':
        return {
          start: date.startOf('month').toDate(),
          end: date.endOf('month').toDate(),
        };
      case 'yearly':
        return {
          start: date.startOf('year').toDate(),
          end: date.endOf('year').toDate(),
        };
      default:
        return {
          start: date.startOf('month').toDate(),
          end: date.endOf('month').toDate(),
        };
    }
  }, []);

  // period navigation actions
  const handlePeriodTypeChange = useCallback(
    (newType: PeriodType) => {
      const now = dayjs();
      const { start, end } = getPeriodBoundaries(newType, now.toDate());

      updateSearchParams({
        startDate: dayjs(start).format('YYYY-MM-DD'),
        endDate: dayjs(end).format('YYYY-MM-DD'),
      });
    },
    [updateSearchParams, getPeriodBoundaries]
  );

  const handlePeriodNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const currentStart = dayjs(periodStartDate);
      const amount = direction === 'prev' ? -1 : 1;

      let newStart: dayjs.Dayjs;
      switch (currentPeriodType) {
        case 'weekly':
          newStart = currentStart.add(amount, 'week');
          break;
        case 'monthly':
          newStart = currentStart.add(amount, 'month');
          break;
        case 'yearly':
          newStart = currentStart.add(amount, 'year');
          break;
        default:
          newStart = currentStart.add(amount, 'month');
      }

      const { start, end } = getPeriodBoundaries(currentPeriodType, newStart.toDate());

      updateSearchParams({
        startDate: dayjs(start).format('YYYY-MM-DD'),
        endDate: dayjs(end).format('YYYY-MM-DD'),
      });
    },
    [periodStartDate, currentPeriodType, updateSearchParams, getPeriodBoundaries]
  );

  const resetToCurrentPeriod = useCallback(() => {
    const now = dayjs();
    const { start, end } = getPeriodBoundaries(currentPeriodType, now.toDate());

    updateSearchParams({
      startDate: dayjs(start).format('YYYY-MM-DD'),
      endDate: dayjs(end).format('YYYY-MM-DD'),
    });
  }, [currentPeriodType, updateSearchParams, getPeriodBoundaries]);

  // panel navigation actions
  const handlePanelNavigation = useCallback(
    async (panel: PanelType) => {
      const routeMap = {
        period: '/analytics/period-breakdown',
        categories: '/analytics/categories',
        accounts: '/analytics/accounts',
      };

      await router.navigate({ to: routeMap[panel] });
    },
    [router]
  );

  // search and filter actions
  const updateSearchQuery = useCallback(
    (query: string) => {
      updateSearchParams({ query: query || undefined });
    },
    [updateSearchParams]
  );

  const updateDateRange = useCallback(
    (range: { start: Date; end: Date } | undefined) => {
      updateSearchParams({
        startDate: range ? dayjs(range.start).format('YYYY-MM-DD') : undefined,
        endDate: range ? dayjs(range.end).format('YYYY-MM-DD') : undefined,
      });
    },
    [updateSearchParams]
  );

  const updateCategoryFilter = useCallback(
    (categories: string[]) => {
      updateSearchParams({ categories: categories.length ? categories : undefined });
    },
    [updateSearchParams]
  );

  const updateAccountFilter = useCallback(
    (accounts: string[]) => {
      updateSearchParams({ accounts: accounts.length ? accounts : undefined });
    },
    [updateSearchParams]
  );

  const updateAmountRange = useCallback(
    (range: { min: number; max: number } | undefined) => {
      updateSearchParams({
        minAmount: range?.min,
        maxAmount: range?.max,
      });
    },
    [updateSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    updateSearchParams({
      query: undefined,
      categories: undefined,
      accounts: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  }, [updateSearchParams]);

  // state object - only expose computed values
  const state: SummaryFiltersState = useMemo(
    () => ({
      selectedPanel,
      searchFilters,
      currentPeriodDisplay,
      isCurrentPeriod,
      periodStartDate,
      periodEndDate,
    }),
    [selectedPanel, searchFilters, currentPeriodDisplay, isCurrentPeriod, periodStartDate, periodEndDate]
  );

  // actions object - expose clean API
  const actions: SummaryFiltersActions = useMemo(
    () => ({
      setSelectedPanel: () => {
        // panel is derived from route, so this is a no-op
        // navigation should use navigateToPanel instead
      },
      navigateToPanel: handlePanelNavigation,
      updateSearchQuery,
      updateDateRange,
      updateCategoryFilter,
      updateAccountFilter,
      updateAmountRange,
      clearAllFilters,
      navigatePeriod: handlePeriodNavigate,
      resetToCurrentPeriod,
    }),
    [
      handlePanelNavigation,
      updateSearchQuery,
      updateDateRange,
      updateCategoryFilter,
      updateAccountFilter,
      updateAmountRange,
      clearAllFilters,
      handlePeriodNavigate,
      resetToCurrentPeriod,
    ]
  );

  return {
    state,
    actions,
    // internal period controls for period selector component
    _internal: {
      currentPeriodType,
      setPeriodType: handlePeriodTypeChange,
      navigatePeriod: handlePeriodNavigate,
      goToCurrentPeriod: resetToCurrentPeriod,
    } as InternalPeriodControls,
  };
};

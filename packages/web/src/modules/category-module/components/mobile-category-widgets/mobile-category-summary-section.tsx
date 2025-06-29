import dayjs from 'dayjs';
import { useMemo, type FC } from 'react';

import { Tile, TextInput } from '../../../../components';
import { useApiSummaryCategoriesQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import type { Category } from '../../../../types/api';
import { useCategoriesSearch } from '../../hooks';
import { CategoryIcon } from '../category-icon';

import type { PeriodType } from './mobile-category-insights-widget';

interface MobileCategorySummarySectionProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCategoryCardClick: (category: Category) => void;
  selectedPeriod: PeriodType;
}

interface CategoryWithMetrics extends Category {
  currentPeriodExpenses: number;
  currentPeriodIncome: number;
  currentPeriodTransactions: number;
}

/**
 * MobileCategorySummarySection displays categories in a mobile-optimized list format.
 * Includes integrated search functionality and shows category activity prominently.
 * Displays current month income/expenses for activity context with enhanced visual design.
 * Category cards are clickable and trigger the onCategoryCardClick callback for editing.
 */
export const MobileCategorySummarySection: FC<MobileCategorySummarySectionProps> = ({
  categories,
  searchQuery,
  onSearchChange,
  onCategoryCardClick,
  selectedPeriod,
}) => {
  const now = dayjs();

  // calculate date ranges for the selected period
  const { startDate, endDate, periodLabel } = useMemo(() => {
    switch (selectedPeriod) {
      case 'today':
        return {
          startDate: now.startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString(),
          periodLabel: 'Today',
        };
      case 'week':
        return {
          startDate: now.startOf('week').toISOString(),
          endDate: now.endOf('week').toISOString(),
          periodLabel: 'This Week',
        };
      case 'month':
      default:
        return {
          startDate: now.startOf('month').toISOString(),
          endDate: now.endOf('month').toISOString(),
          periodLabel: now.format('MMM YYYY'),
        };
    }
  }, [selectedPeriod, now]);

  // fetch summary for the selected period
  const [summaryData, , state] = useApiSummaryCategoriesQuery({
    startDate,
    endDate,
  });

  // use the custom hook for search functionality
  const { filteredParentCategories } = useCategoriesSearch({
    categories,
    searchQuery,
  });

  // enhance categories with current period metrics
  const enhancedCategories = useMemo((): CategoryWithMetrics[] => {
    if (!summaryData) return filteredParentCategories as CategoryWithMetrics[];

    const summaryMap = new Map(summaryData.map((s) => [s.categoryId, s]));

    return filteredParentCategories.map((category) => {
      const summary = summaryMap.get(category.id);
      const currentPeriodExpenses = summary?.totalExpenses ?? 0;
      const currentPeriodIncome = summary?.totalIncome ?? 0;
      const currentPeriodTransactions = summary?.totalTransactions ?? 0;

      return {
        ...category,
        currentPeriodExpenses,
        currentPeriodIncome,
        currentPeriodTransactions,
      };
    });
  }, [filteredParentCategories, summaryData]);

  // sort categories by current period activity for mobile relevance
  const sortedCategories = useMemo(() => {
    return [...enhancedCategories].sort((a, b) => {
      // prioritize categories with recent activity
      if (a.currentPeriodTransactions !== b.currentPeriodTransactions) {
        return b.currentPeriodTransactions - a.currentPeriodTransactions;
      }
      // then sort alphabetically
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [enhancedCategories]);

  const getActivityStatus = (transactions: number) => {
    if (transactions > 10) return { text: 'Very Active', color: 'text-sage-600' };
    if (transactions > 5) return { text: 'Active', color: 'text-mist-600' };
    if (transactions > 0) return { text: 'Some Activity', color: 'text-warning-600' };
    return { text: 'No Activity', color: 'text-slate-400' };
  };

  // show skeleton loader while data is loading
  if (state.isLoading && !summaryData) {
    return <SummarySkeletonLoader />;
  }

  return (
    <Tile className="p-4">
      <div className="space-y-4">
        {/* integrated header with search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Management</h3>
              <p className="text-sm text-slate-500">
                {searchQuery
                  ? `${sortedCategories.length} of ${categories.length} categories`
                  : `${categories.length} total categories`}
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{periodLabel}</span>
          </div>

          {/* search input */}
          <TextInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search categories by name or notes..."
          />
        </div>

        {sortedCategories.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div>
                <p className="text-sm font-medium text-slate-600">No categories found</p>
                <p className="text-xs text-slate-500">Try adjusting your search terms</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-600">No categories yet</p>
                <p className="text-xs text-slate-500">Add your first category to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map((category) => {
              const activityStatus = getActivityStatus(category.currentPeriodTransactions);
              const hasActivity = category.currentPeriodTransactions > 0;
              const totalAmount = category.currentPeriodIncome - category.currentPeriodExpenses;

              return (
                <div
                  key={category.id}
                  onClick={() => onCategoryCardClick(category)}
                  className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                    hasActivity
                      ? 'bg-white border-mist-200 hover:border-sage-300 hover:shadow-md'
                      : 'bg-mist-25 border-mist-100 hover:border-mist-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CategoryIcon
                        iconValue={category.metadata?.icon ?? 'tag'}
                        colorValue={category.metadata?.color ?? 'coral'}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate">{category.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${activityStatus.color}`}>{activityStatus.text}</span>
                          {hasActivity && <span className="text-xs text-slate-400">•</span>}
                          {hasActivity && (
                            <span className="text-xs text-slate-500">
                              {category.currentPeriodTransactions} transaction
                              {category.currentPeriodTransactions !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Smart visual indicator for activity level */}
                    <div className="flex-shrink-0 ml-2">
                      {hasActivity && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {formatAmount(totalAmount, { compact: true, type: totalAmount > 0 ? 'income' : 'expense' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Current Period Activity Details */}
                  {hasActivity && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-mist-100">
                      <div className="text-center p-2 rounded bg-sage-50 border border-sage-100">
                        <p className="text-xs text-sage-600 font-medium">Income</p>
                        <p className="text-sm font-bold text-sage-700">
                          {formatAmount(category.currentPeriodIncome, { compact: true, hidePrefix: true })}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded bg-coral-50 border border-coral-100">
                        <p className="text-xs text-coral-600 font-medium">Expenses</p>
                        <p className="text-sm font-bold text-coral-700">
                          {formatAmount(category.currentPeriodExpenses, { compact: true, hidePrefix: true })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Smart empty state for inactive categories */}
                  {!hasActivity && (
                    <div className="pt-2 border-t border-mist-100">
                      <p className="text-xs text-slate-400 text-center">
                        No transactions {selectedPeriod === 'today' ? 'today' : `this ${selectedPeriod}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Tile>
  );
};

/**
 * Smart skeleton loading state for summary section
 */
const SummarySkeletonLoader: FC = () => (
  <Tile className="p-4">
    <div className="space-y-4">
      {/* header skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mt-1" />
          </div>
          <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* search skeleton */}
        <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
      </div>

      {/* category cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-4 rounded-lg border border-mist-100 bg-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mt-1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-mist-100">
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <div className="h-3 w-12 bg-slate-200 rounded animate-pulse mx-auto" />
                <div className="h-4 w-8 bg-slate-200 rounded animate-pulse mx-auto mt-1" />
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-100">
                <div className="h-3 w-12 bg-slate-200 rounded animate-pulse mx-auto" />
                <div className="h-4 w-8 bg-slate-200 rounded animate-pulse mx-auto mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Tile>
);

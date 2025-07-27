import { TextInput } from '@dimasbaguspm/versaur/forms';
import { Badge, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import dayjs from 'dayjs';
import { useMemo, type FC } from 'react';

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
    <Tile>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Text as="h3" fontSize="lg" fontWeight="semibold">
                Management
              </Text>
              <Text as="p" fontSize="sm">
                {searchQuery
                  ? `${sortedCategories.length} of ${categories.length} categories`
                  : `${categories.length} total categories`}
              </Text>
            </div>
            <Badge color="neutral" size="sm" shape="rounded" className="px-2">
              {periodLabel}
            </Badge>
          </div>

          <TextInput
            variant="ghost"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search categories by name or notes..."
          />
        </div>

        {sortedCategories.length === 0 ? (
          <div className="py-8">
            {searchQuery ? (
              <>
                <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                  No categories found
                </Text>
                <Text as="p" fontSize="xs" align="center" className="text-xs text-slate-500">
                  Try adjusting your search terms
                </Text>
              </>
            ) : (
              <>
                <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                  No categories yet
                </Text>
                <Text as="p" fontSize="xs">
                  Add your first category to get started
                </Text>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCategories.map((category) => {
              const activityStatus = getActivityStatus(category.currentPeriodTransactions);
              const hasActivity = category.currentPeriodTransactions > 0;
              const totalAmount = category.currentPeriodIncome - category.currentPeriodExpenses;

              return (
                <Tile key={category.id} onClick={() => onCategoryCardClick(category)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CategoryIcon
                        iconValue={category.metadata?.icon ?? 'tag'}
                        colorValue={category.metadata?.color ?? 'coral'}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Text as="h4" fontSize="sm" fontWeight="medium" clamp={1} ellipsis>
                          {category.name}
                        </Text>

                        <div className="flex items-center gap-2 mt-1">
                          <Badge color="ghost" size="sm" className="px-2">
                            {activityStatus.text}
                          </Badge>

                          {hasActivity && (
                            <Text as="span" fontSize="xs">
                              •
                            </Text>
                          )}
                          {hasActivity && (
                            <Text as="span" fontSize="xs">
                              {category.currentPeriodTransactions} transaction
                              {category.currentPeriodTransactions !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Smart visual indicator for activity level */}
                    <div className="flex-shrink-0 ml-2">
                      {hasActivity && (
                        <>
                          <Text as="p" fontSize="xs">
                            Total
                          </Text>
                          <Text as="p" fontSize="sm" fontWeight="semibold">
                            {formatAmount(totalAmount, { compact: true, hidePrefix: totalAmount > 0 })}
                          </Text>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <Tile variant="secondary" size="xs">
                      <Text as="p" fontSize="xs" color="secondary" fontWeight="medium" align="center">
                        Income
                      </Text>
                      <Text as="p" fontSize="lg" fontWeight="bold" align="center" color="secondary">
                        {formatAmount(category.currentPeriodIncome, { compact: true, hidePrefix: true })}
                      </Text>
                    </Tile>
                    <Tile variant="primary" size="xs">
                      <Text as="p" fontSize="xs" color="primary" fontWeight="medium" align="center">
                        Expenses
                      </Text>
                      <Text as="p" fontSize="lg" fontWeight="bold" color="primary" align="center">
                        {formatAmount(category.currentPeriodExpenses, { compact: true, hidePrefix: true })}
                      </Text>
                    </Tile>
                  </div>
                </Tile>
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

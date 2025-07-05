import { List, Grid3X3, Search, X } from 'lucide-react';
import React, { useState } from 'react';

import { Tile, IconButton, TextInput } from '../../../../../components';
import { formatAmount } from '../../../../../libs/format-amount';
import type { Category } from '../../../../../types/api';
import { CategoryIcon } from '../../../../category-module/components/category-icon/category-icon';
import type { EnrichedCategoryData } from '../helpers/mobile-categories-mappers';

interface MobileCategoriesTableProps {
  data: EnrichedCategoryData[];
  categories: Category[];
  chartType: 'expenses' | 'income';
  onCategoryClick?: (categoryId: number) => void;
}

/**
 * Mobile-optimized table for categories data
 * Uses card-based layout with compact/detailed view options
 */
export const MobileCategoriesTable: React.FC<MobileCategoriesTableProps> = ({
  data,
  categories,
  chartType,
  onCategoryClick,
}) => {
  const [isCompactView, setIsCompactView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // build category map for quick lookup
  const categoryMap = React.useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        if (category.id) {
          acc[category.id] = category;
        }
        return acc;
      },
      {} as Record<number, Category>
    );
  }, [categories]);

  // filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;

    return data.filter((categoryData) => categoryData.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data, searchQuery]);

  // sort filtered data by the selected chart type (highest first)
  const sortedData = React.useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA;
    });
  }, [filteredData, chartType]);

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-4">
        {/* header with view toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Category Details</h3>
            <p className="text-sm text-slate-500">
              Financial metrics for {filteredData.length} categories, sorted by highest {chartType}
            </p>
          </div>

          {/* view toggle for mobile */}
          <div className="flex items-center gap-1 bg-mist-100 rounded-lg p-1 flex-shrink-0">
            <IconButton
              variant={isCompactView ? 'mist-ghost' : 'mist'}
              size="sm"
              onClick={() => setIsCompactView(false)}
              aria-label="Detailed view"
            >
              <List className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant={isCompactView ? 'mist' : 'mist-ghost'}
              size="sm"
              onClick={() => setIsCompactView(true)}
              aria-label="Compact view"
            >
              <Grid3X3 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* search bar for filtering categories */}
        <div className="relative">
          <TextInput
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            size="sm"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {sortedData.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div>
                <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-1">No categories match "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Clear search to see all categories
                </button>
              </div>
            ) : (
              <div>
                <div className="text-slate-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No category data available</p>
                <p className="text-xs text-slate-400">Try selecting a different time period</p>
              </div>
            )}
          </div>
        ) : (
          <div className={isCompactView ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'space-y-3'}>
            {sortedData.map((categoryData) => {
              const category = categoryMap[categoryData.categoryId];
              const primaryValue = chartType === 'expenses' ? categoryData.totalExpenses : categoryData.totalIncome;
              const primaryColorClass = chartType === 'expenses' ? 'text-coral-600' : 'text-sage-600';

              if (isCompactView) {
                // compact card view - smaller cards in grid
                return (
                  <div
                    key={categoryData.categoryId}
                    className={`p-3 rounded-xl border border-mist-200 bg-white transition-all duration-200 ${
                      onCategoryClick ? 'cursor-pointer hover:border-mist-300 hover:bg-mist-25 hover:shadow-sm' : ''
                    }`}
                    onClick={() => onCategoryClick?.(categoryData.categoryId)}
                  >
                    <div className="flex flex-col items-center text-center space-y-2.5">
                      <CategoryIcon
                        iconValue={category?.metadata?.icon}
                        colorValue={category?.metadata?.color}
                        size="sm"
                      />
                      <div className="min-w-0 w-full">
                        <p className="text-xs font-medium text-slate-900 truncate leading-tight">
                          {categoryData.categoryName}
                        </p>
                        <p className={`text-sm font-semibold tabular-nums ${primaryColorClass} mt-1`}>
                          {formatAmount(primaryValue, { compact: true, hidePrefix: true })}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {categoryData.totalTransactions} txn{categoryData.totalTransactions === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // detailed card view - full width cards with better spacing
              return (
                <div
                  key={categoryData.categoryId}
                  className={`p-4 rounded-xl border border-mist-200 bg-white transition-all duration-200 ${
                    onCategoryClick ? 'cursor-pointer hover:border-mist-300 hover:bg-mist-25 hover:shadow-sm' : ''
                  }`}
                  onClick={() => onCategoryClick?.(categoryData.categoryId)}
                >
                  <div className="flex items-center justify-between">
                    {/* category info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CategoryIcon
                        iconValue={category?.metadata?.icon}
                        colorValue={category?.metadata?.color}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate leading-tight">
                          {categoryData.categoryName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {categoryData.totalTransactions} transaction{categoryData.totalTransactions === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {/* primary value */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${primaryColorClass}`}>
                        {formatAmount(primaryValue, { compact: false, hidePrefix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Tile>
  );
};

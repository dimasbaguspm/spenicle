import { ButtonIcon, Icon, Text, TextInput, Tile } from '@dimasbaguspm/versaur';
import { Search, X } from 'lucide-react';
import React, { useState } from 'react';

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
    <Tile>
      <div className="space-y-4">
        {/* header with view toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Text as="h3" fontSize="lg" fontWeight="semibold">
              Category Details
            </Text>
            <Text fontSize="sm">
              Financial metrics for {filteredData.length} categories, sorted by highest {chartType}
            </Text>
          </div>
        </div>

        {/* search bar for filtering categories */}
        <div className="relative">
          <TextInput
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Icon
            as={Search}
            size="sm"
            color={searchQuery ? 'primary' : 'ghost'}
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          />
          {searchQuery && (
            <ButtonIcon
              as={X}
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            />
          )}
        </div>

        {sortedData.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <>
                <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                  No categories found
                </Text>
                <Text as="p" fontSize="xs" align="center">
                  Try adjusting your search terms
                </Text>
              </>
            ) : (
              <>
                <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                  No category data available
                </Text>
                <Text as="p" fontSize="xs" align="center">
                  Add some transactions to see category metrics
                </Text>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedData.map((categoryData) => {
              const category = categoryMap[categoryData.categoryId];
              const primaryValue = chartType === 'expenses' ? categoryData.totalExpenses : categoryData.totalIncome;
              const color = chartType === 'expenses' ? 'primary' : 'secondary';

              return (
                <Tile key={categoryData.categoryId} onClick={() => onCategoryClick?.(categoryData.categoryId)}>
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
                        <Text as="p" fontSize="sm" fontWeight="medium" ellipsis clamp={1}>
                          {categoryData.categoryName}
                        </Text>
                        <Text fontSize="xs">
                          {categoryData.totalTransactions} transaction{categoryData.totalTransactions === 1 ? '' : 's'}
                        </Text>
                      </div>
                    </div>

                    <Text as="p" fontSize="sm" fontWeight="semibold" align="right" color={color}>
                      {formatAmount(primaryValue, { compact: false, hidePrefix: true })}
                    </Text>
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

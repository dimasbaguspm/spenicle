import type { PieChartDatum } from '../../../../../components/pie-chart';
import type { Category, SummaryCategoriesPeriod } from '../../../../../types/api';

// pie chart color palette matching our design system
const CATEGORY_COLORS = [
  '#e07a5f', // coral - primary
  '#81b29a', // sage - secondary
  '#6b8fad', // mist info blue
  '#e08a47', // coral harmonized amber
  '#6db285', // sage based green
  '#94a3b8', // slate 400
  '#e06650', // coral family red
  '#f1f5f9', // slate 50
  '#cbd5e1', // slate 300
  '#64748b', // slate 500
];

export interface EnrichedCategoryData {
  categoryId: number;
  categoryName: string;
  iconValue?: string;
  colorValue?: string;
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  totalTransactions: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Maps category summary data with category metadata for enhanced display
 */
export function mapEnrichedCategoryData({
  categoriesData,
  categoryMap,
}: {
  categoriesData: SummaryCategoriesPeriod;
  categoryMap: Record<number, Category>;
}): EnrichedCategoryData[] {
  return (categoriesData ?? []).map((category) => {
    const categoryObj = categoryMap[category.categoryId ?? -1];
    const metadata = categoryObj?.metadata ?? {};

    return {
      categoryId: category.categoryId ?? -1,
      categoryName: categoryObj?.name ?? `Category #${category.categoryId}`,
      iconValue: 'icon' in metadata ? metadata.icon : undefined,
      colorValue: 'color' in metadata ? metadata.color : undefined,
      totalIncome: category.totalIncome ?? 0,
      totalExpenses: category.totalExpenses ?? 0,
      totalNet: category.totalNet ?? 0,
      totalTransactions: category.totalTransactions ?? 0,
      startDate: category.startDate,
      endDate: category.endDate,
    };
  });
}

/**
 * Prepares pie chart data from category data with percentage calculations
 * Can be based on expenses or income based on chartType
 */
export function mapCategoryPieChartData({
  categoryData,
  chartType = 'expenses',
}: {
  categoryData: EnrichedCategoryData[];
  chartType?: 'expenses' | 'income';
}): PieChartDatum[] {
  // calculate total for percentage calculation
  const total = categoryData.reduce((sum, category) => {
    return sum + (chartType === 'expenses' ? category.totalExpenses : category.totalIncome);
  }, 0);

  if (total === 0) return [];

  // filter out categories with zero amounts and sort by usage (highest first)
  const filteredAndSorted = categoryData
    .filter((category) => {
      const value = chartType === 'expenses' ? category.totalExpenses : category.totalIncome;
      return value > 0;
    })
    .sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA; // highest first
    });

  return filteredAndSorted.map((category, index) => {
    const value = chartType === 'expenses' ? category.totalExpenses : category.totalIncome;
    const percentage = (value / total) * 100;

    // ensure we always have a color - prioritize category color, then fallback to palette
    const assignedColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

    return {
      name: category.categoryName,
      value,
      percentage,
      fill: assignedColor,
    };
  });
}

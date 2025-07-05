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
  if (!categoriesData || !Array.isArray(categoriesData)) {
    return [];
  }

  return categoriesData
    .filter((item) => item.categoryId != null)
    .map((item) => {
      const category = categoryMap[item.categoryId!];
      return {
        categoryId: item.categoryId!,
        categoryName: category?.name ?? 'Unknown Category',
        iconValue: category?.metadata?.icon,
        colorValue: category?.metadata?.color,
        totalIncome: item.totalIncome ?? 0,
        totalExpenses: item.totalExpenses ?? 0,
        totalNet: item.totalNet ?? 0,
        totalTransactions: item.totalTransactions ?? 0,
        startDate: item.startDate,
        endDate: item.endDate,
      };
    });
}

/**
 * Maps enriched category data to pie chart format for mobile visualization
 */
export function mapCategoryPieChartData({
  categoryData,
  chartType,
}: {
  categoryData: EnrichedCategoryData[];
  chartType: 'expenses' | 'income';
}): PieChartDatum[] {
  if (!categoryData || categoryData.length === 0) {
    return [];
  }

  // filter categories that have activity for the selected chart type
  const activeCategoryData = categoryData.filter((category) => {
    const value = chartType === 'expenses' ? category.totalExpenses : category.totalIncome;
    return value > 0;
  });

  if (activeCategoryData.length === 0) {
    return [];
  }

  return activeCategoryData.map((category, index) => {
    const value = chartType === 'expenses' ? category.totalExpenses : category.totalIncome;
    const total = activeCategoryData.reduce((sum, cat) => {
      return sum + (chartType === 'expenses' ? cat.totalExpenses : cat.totalIncome);
    }, 0);
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return {
      name: category.categoryName,
      value: value,
      percentage: percentage,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    };
  });
}

/**
 * Maps enriched category data for mobile card list display
 */
export function mapCategoryCardData({
  categoryData,
  categoryMap,
}: {
  categoryData: EnrichedCategoryData[];
  categoryMap: Record<number, Category>;
}): Array<{
  category: Category | undefined;
  categoryPeriod: EnrichedCategoryData;
}> {
  if (!categoryData || categoryData.length === 0) {
    return [];
  }

  return categoryData.map((categoryPeriod) => ({
    category: categoryMap[categoryPeriod.categoryId],
    categoryPeriod,
  }));
}

import type { Category, SummaryCategoriesPeriod } from '../../types/api';

/**
 * Prepares radar chart data from categories and summary periods.
 * Each entry will have category name, totalIncome, totalExpenses, totalNet, totalTransactions.
 */
export function getRadarChartData(
  categories: Category[],
  summary: SummaryCategoriesPeriod
): Array<{
  category: string;
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  totalTransactions: number;
}> {
  const periodsMap = new Map((summary ?? []).map((p) => [p.categoryId, p]));
  return (categories ?? []).map((cat) => {
    const period = periodsMap.get(cat.id) ?? {};
    return {
      category: cat.name ?? 'Unknown',
      totalIncome: typeof period.totalIncome === 'number' ? period.totalIncome : 0,
      totalExpenses: typeof period.totalExpenses === 'number' ? period.totalExpenses : 0,
      totalNet: typeof period.totalNet === 'number' ? period.totalNet : 0,
      totalTransactions: typeof period.totalTransactions === 'number' ? period.totalTransactions : 0,
    };
  });
}

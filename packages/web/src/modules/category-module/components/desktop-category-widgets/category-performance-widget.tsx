import dayjs from 'dayjs';
import { useMemo, useState, type FC } from 'react';

import { BarChart, RadarChart, Tile } from '../../../../components';
import { useApiCategoriesQuery, useApiSummaryCategoriesQuery } from '../../../../hooks';

/**
 * CategoryPerformanceWidget displays visual charts for category spending analysis.
 * Shows both bar chart and radar chart views with period comparison.
 */
export const CategoryPerformanceWidget: FC = () => {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  const now = dayjs();
  const currentMonth = now.startOf('month');

  // fetch categories and summary data for current month
  const [categoriesData] = useApiCategoriesQuery();
  const [currentSummaryData] = useApiSummaryCategoriesQuery({
    startDate: currentMonth.toISOString(),
    endDate: currentMonth.endOf('month').toISOString(),
  });

  const categories = categoriesData?.items ?? [];
  const summaryData = currentSummaryData ?? [];

  // prepare chart data
  const chartData = useMemo(() => {
    if (!categories.length || !summaryData.length) return [];

    // create a map for quick category lookup
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    // merge summary data with category names
    return summaryData
      .filter((period) => (period.totalExpenses ?? 0) > 0) // only show categories with expenses
      .map((period) => {
        const category = categoryMap.get(period.categoryId);
        return {
          category: category?.name ?? `Category ${period.categoryId}`,
          totalIncome: period.totalIncome ?? 0,
          totalExpenses: period.totalExpenses ?? 0,
          totalNet: (period.totalIncome ?? 0) - (period.totalExpenses ?? 0),
          totalTransactions: period.totalTransactions ?? 0,
        };
      })
      .sort((a, b) => b.totalExpenses - a.totalExpenses) // sort by expenses descending
      .slice(0, 10); // limit to top 10 categories for readability
  }, [categories, summaryData]);

  return (
    <Tile className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Category Performance</h3>
          <p className="text-sm text-slate-500">
            Top spending categories for {now.format('MMMM YYYY')} (showing top 10)
          </p>
        </div>

        {/* chart type toggle */}
        <div className="flex bg-mist-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              chartType === 'bar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-mist-50'
            }`}
          >
            Bar Chart
          </button>
          <button
            type="button"
            onClick={() => setChartType('radar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              chartType === 'radar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-mist-50'
            }`}
          >
            Radar Chart
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-cream-50 rounded-lg border border-mist-100">
          <div className="text-center">
            <p className="text-slate-500 font-medium">No spending data available</p>
            <p className="text-sm text-slate-400">Start adding transactions to see category performance</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              xKey="category"
              dataKey={['totalIncome', 'totalExpenses']}
              legendAlign="center"
              xAxisTickFormatter={(value) => {
                // truncate long category names for better readability
                return value.length > 12 ? `${value.slice(0, 12)}...` : value;
              }}
            />
          ) : (
            <RadarChart data={chartData} dataKey={['totalIncome', 'totalExpenses']} legendAlign="center" />
          )}

          {/* summary stats below chart */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-mist-100">
            <div className="text-center">
              <p className="text-sm text-slate-500">Categories Shown</p>
              <p className="text-lg font-semibold text-slate-900">{chartData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="text-lg font-semibold text-coral-600">
                ${chartData.reduce((sum, item) => sum + item.totalExpenses, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Transactions</p>
              <p className="text-lg font-semibold text-mist-600">
                {chartData.reduce((sum, item) => sum + item.totalTransactions, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Tile>
  );
};

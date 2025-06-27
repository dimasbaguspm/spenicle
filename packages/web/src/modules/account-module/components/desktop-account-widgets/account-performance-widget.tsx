import dayjs from 'dayjs';
import { useMemo, useState, type FC } from 'react';

import { BarChart, RadarChart, Tile } from '../../../../components';
import { useApiAccountsQuery, useApiSummaryAccountsQuery } from '../../../../hooks';

/**
 * AccountPerformanceWidget displays visual charts for account activity analysis.
 * Shows both bar chart and radar chart views with transaction and balance insights.
 */
export const AccountPerformanceWidget: FC = () => {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  const now = dayjs();
  const currentMonth = now.startOf('month');

  // fetch accounts and summary data for current month
  const [accountsData] = useApiAccountsQuery();
  const [currentSummaryData] = useApiSummaryAccountsQuery({
    startDate: currentMonth.toISOString(),
    endDate: currentMonth.endOf('month').toISOString(),
  });

  const accounts = accountsData?.items ?? [];
  const summaryData = currentSummaryData ?? [];

  // prepare chart data
  const chartData = useMemo(() => {
    if (!accounts.length || !summaryData.length) return [];

    // create a map for quick account lookup
    const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

    // merge summary data with account names
    return summaryData
      .filter((period) => (period.totalExpenses ?? 0) > 0 || (period.totalIncome ?? 0) > 0) // only show accounts with activity
      .map((period) => {
        const account = accountMap.get(period.accountId);
        return {
          category: account?.name ?? `Account ${period.accountId}`, // Use 'category' for RadarChart compatibility
          account: account?.name ?? `Account ${period.accountId}`,
          totalIncome: period.totalIncome ?? 0,
          totalExpenses: period.totalExpenses ?? 0,
          totalNet: (period.totalIncome ?? 0) - (period.totalExpenses ?? 0),
          totalTransactions: period.totalTransactions ?? 0,
        };
      })
      .sort((a, b) => b.totalTransactions - a.totalTransactions) // sort by activity descending
      .slice(0, 10); // limit to top 10 accounts for readability
  }, [accounts, summaryData]);

  // calculate totals for summary stats
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, curr) => ({
        totalIncome: acc.totalIncome + curr.totalIncome,
        totalExpenses: acc.totalExpenses + curr.totalExpenses,
        totalTransactions: acc.totalTransactions + curr.totalTransactions,
      }),
      { totalIncome: 0, totalExpenses: 0, totalTransactions: 0 }
    );
  }, [chartData]);

  return (
    <Tile className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Performance</h3>
          <p className="text-sm text-slate-500">Most active accounts for {now.format('MMMM YYYY')} (showing top 10)</p>
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
            <p className="text-slate-500 font-medium">No account activity available</p>
            <p className="text-sm text-slate-400">Start adding transactions to see account performance</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {chartType === 'bar' ? (
            <BarChart
              data={chartData}
              xKey="account"
              dataKey={['totalIncome', 'totalExpenses']}
              legendAlign="center"
              xAxisTickFormatter={(value) => {
                // truncate long account names for better readability
                return value.length > 12 ? `${value.slice(0, 12)}...` : value;
              }}
            />
          ) : (
            <RadarChart data={chartData} dataKey={['totalIncome', 'totalExpenses']} legendAlign="center" />
          )}

          {/* summary stats below chart */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-mist-100">
            <div className="text-center">
              <p className="text-sm text-slate-500">Accounts Shown</p>
              <p className="text-lg font-semibold text-slate-900">{chartData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Income</p>
              <p className="text-lg font-semibold text-sage-600">
                ${totals.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="text-lg font-semibold text-coral-600">
                ${totals.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </Tile>
  );
};

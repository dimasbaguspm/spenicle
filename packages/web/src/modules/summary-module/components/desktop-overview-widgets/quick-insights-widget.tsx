import { TrendingUp, TrendingDown, PercentDiamondIcon, Activity } from 'lucide-react';
import { useMemo } from 'react';

import { Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import { useDesktopSummaryFilters } from '../../hooks';

interface InsightData {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export const QuickInsightsWidget = () => {
  const { state } = useDesktopSummaryFilters();

  // current month data
  const [currentData] = useApiSummaryTransactionsQuery({
    startDate: state.periodStartDate.toISOString(),
    endDate: state.periodEndDate.toISOString(),
  });

  const insights = useMemo((): InsightData[] => {
    if (!currentData) return [];

    const currentTotals = currentData.reduce(
      (acc, period) => ({
        income: acc.income + (period.totalIncome ?? 0),
        expenses: acc.expenses + (period.totalExpenses ?? 0),
        transactionCount: acc.transactionCount + (period.totalTransactions ?? 0),
      }),
      { income: 0, expenses: 0, transactionCount: 0 }
    );

    const net = currentTotals.income - currentTotals.expenses;

    // calculate savings rate
    const savingsRate = currentTotals.income > 0 ? (net / currentTotals.income) * 100 : 0;

    return [
      {
        label: 'Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        icon: PercentDiamondIcon,
        iconColor: savingsRate >= 20 ? 'text-sage-600' : savingsRate >= 10 ? 'text-mist-600' : 'text-coral-600',
      },
      {
        label: 'Transactions',
        value: currentTotals.transactionCount.toString(),
        icon: Activity,
        iconColor: 'text-mist-600',
      },
      {
        label: 'Income',
        value: formatAmount(currentTotals.income, { compact: true, hidePrefix: true }),
        icon: TrendingUp,
        iconColor: 'text-sage-600',
      },
      {
        label: 'Expenses',
        value: formatAmount(currentTotals.expenses, { compact: true, hidePrefix: true }),
        icon: TrendingDown,
        iconColor: 'text-coral-600',
      },
    ];
  }, [currentData]);

  return (
    <Tile className="p-4">
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Quick Insights</h3>
        <p className="text-sm text-slate-500">Key financial indicators for {state.currentPeriodDisplay}</p>
      </div>

      {/* desktop grid layout for insights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div key={index} className="space-y-3 p-4 rounded-lg border border-mist-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className={`h-4 w-4 ${insight.iconColor}`} />
                  <span className="text-xs font-medium text-slate-600 truncate">{insight.label}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{insight.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Tile>
  );
};

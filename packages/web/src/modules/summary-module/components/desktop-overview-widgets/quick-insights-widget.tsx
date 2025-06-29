import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, PiggyBank, Target, Wallet } from 'lucide-react';
import { useMemo } from 'react';

import { Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface InsightData {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export const QuickInsightsWidget = () => {
  const now = dayjs();
  const currentMonth = now.startOf('month');

  // current month data
  const [currentData] = useApiSummaryTransactionsQuery({
    startDate: currentMonth.toISOString(),
    endDate: currentMonth.endOf('month').toISOString(),
  });

  const insights = useMemo((): InsightData[] => {
    if (!currentData) return [];

    const currentTotals = currentData.reduce(
      (acc, period) => ({
        income: acc.income + (period.totalIncome ?? 0),
        expenses: acc.expenses + (period.totalExpenses ?? 0),
      }),
      { income: 0, expenses: 0 }
    );

    const net = currentTotals.income - currentTotals.expenses;

    // calculate savings rate
    const savingsRate = currentTotals.income > 0 ? (net / currentTotals.income) * 100 : 0;

    return [
      {
        label: 'Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        icon: PiggyBank,
        iconColor: savingsRate >= 20 ? 'text-sage-600' : savingsRate >= 10 ? 'text-mist-600' : 'text-coral-600',
      },
      {
        label: 'Total Expenses',
        value: formatAmount(currentTotals.expenses, { compact: true }),
        icon: Target,
        iconColor: 'text-coral-600',
      },
      {
        label: 'Net Position',
        value: formatAmount(net, { compact: true }),
        icon: net >= 0 ? TrendingUp : TrendingDown,
        iconColor: net >= 0 ? 'text-sage-600' : 'text-coral-600',
      },
      {
        label: 'Monthly Income',
        value: formatAmount(currentTotals.income, { compact: true }),
        icon: Wallet,
        iconColor: 'text-sage-600',
      },
    ];
  }, [currentData]);

  return (
    <Tile className="p-4">
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Quick Insights</h3>
        <p className="text-sm text-slate-500">Key financial indicators for this month</p>
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

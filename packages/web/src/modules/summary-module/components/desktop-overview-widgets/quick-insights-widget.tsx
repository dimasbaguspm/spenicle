import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, PiggyBank, Target, Wallet } from 'lucide-react';
import { useMemo } from 'react';

import { Badge, Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface InsightData {
  label: string;
  value: string;
  change?: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export const QuickInsightsWidget = () => {
  const now = dayjs();
  const currentMonth = now.startOf('month');
  const previousMonth = now.subtract(1, 'month').startOf('month');

  // current month data
  const [currentData] = useApiSummaryTransactionsQuery({
    startDate: currentMonth.toISOString(),
    endDate: currentMonth.endOf('month').toISOString(),
  });

  // previous month data for comparison
  const [previousData] = useApiSummaryTransactionsQuery({
    startDate: previousMonth.toISOString(),
    endDate: previousMonth.endOf('month').toISOString(),
  });

  const insights = useMemo((): InsightData[] => {
    if (!currentData || !previousData) return [];

    const currentTotals = currentData.reduce(
      (acc, period) => ({
        income: acc.income + (period.totalIncome ?? 0),
        expenses: acc.expenses + (period.totalExpenses ?? 0),
      }),
      { income: 0, expenses: 0 }
    );

    const previousTotals = previousData.reduce(
      (acc, period) => ({
        income: acc.income + (period.totalIncome ?? 0),
        expenses: acc.expenses + (period.totalExpenses ?? 0),
      }),
      { income: 0, expenses: 0 }
    );

    const net = currentTotals.income - currentTotals.expenses;
    const previousNet = previousTotals.income - previousTotals.expenses;
    const netChange = net - previousNet;

    const expenseChange = currentTotals.expenses - previousTotals.expenses;

    // calculate savings rate
    const savingsRate = currentTotals.income > 0 ? (net / currentTotals.income) * 100 : 0;
    const previousSavingsRate = previousTotals.income > 0 ? (previousNet / previousTotals.income) * 100 : 0;

    return [
      {
        label: 'Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        change: `${savingsRate >= previousSavingsRate ? '+' : ''}${(savingsRate - previousSavingsRate).toFixed(1)}% from last month`,
        variant: savingsRate >= previousSavingsRate ? 'success' : 'danger',
        trend: savingsRate >= previousSavingsRate ? 'up' : 'down',
        icon: PiggyBank,
        iconColor:
          savingsRate >= previousSavingsRate
            ? 'text-sage-600'
            : savingsRate < previousSavingsRate
              ? 'text-coral-600'
              : 'text-mist-600',
      },
      {
        label: 'Expense Change',
        value: formatAmount(Math.abs(expenseChange), { compact: true }),
        change: expenseChange <= 0 ? 'Decreased' : 'Increased',
        variant: expenseChange <= 0 ? 'success' : 'danger',
        trend: expenseChange <= 0 ? 'up' : 'down',
        icon: Target,
        iconColor: expenseChange <= 0 ? 'text-sage-600' : 'text-coral-600',
      },
      {
        label: 'Net Position',
        value: formatAmount(net, { compact: true }),
        change: netChange >= 0 ? 'Improved' : 'Declined',
        variant: netChange >= 0 ? 'success' : 'danger',
        trend: netChange >= 0 ? 'up' : 'down',
        icon: netChange >= 0 ? TrendingUp : TrendingDown,
        iconColor: netChange >= 0 ? 'text-sage-600' : 'text-coral-600',
      },
      {
        label: 'Monthly Income',
        value: formatAmount(currentTotals.income, { compact: true }),
        change: `${formatAmount(Math.abs(currentTotals.income - previousTotals.income), { compact: true })} from last month`,
        variant: currentTotals.income >= previousTotals.income ? 'success' : 'danger',
        trend: currentTotals.income >= previousTotals.income ? 'up' : 'down',
        icon: Wallet,
        iconColor: currentTotals.income >= previousTotals.income ? 'text-sage-600' : 'text-coral-600',
      },
    ];
  }, [currentData, previousData]);

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-1 mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-slate-900">Quick Insights</h3>
        <p className="text-sm text-slate-500">Key financial indicators for this month</p>
      </div>

      {/* Responsive grid: 2 columns on mobile/tablet, 4 columns on desktop (lg+) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div key={index} className="space-y-3 p-3 md:p-4 rounded-lg border border-mist-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className={`h-4 w-4 ${insight.iconColor}`} />
                  <span className="text-xs font-medium text-slate-600">{insight.label}</span>
                </div>
                <Badge variant={insight.variant} size="sm">
                  {insight.trend === 'up' ? '↗' : insight.trend === 'down' ? '↘' : '→'}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-base md:text-lg font-bold text-slate-900 tabular-nums">{insight.value}</div>
                {insight.change && <div className="text-xs text-slate-500 font-medium">{insight.change}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Tile>
  );
};

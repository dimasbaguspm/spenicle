import dayjs from 'dayjs';
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
        label: 'Monthly Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        change: `${savingsRate >= previousSavingsRate ? '+' : ''}${(savingsRate - previousSavingsRate).toFixed(1)}%`,
        variant: savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'info' : 'warning',
        trend: savingsRate >= previousSavingsRate ? 'up' : 'down',
      },
      {
        label: 'Expense Trend',
        value: formatAmount(Math.abs(expenseChange), { compact: true, showCurrency: true }),
        change: expenseChange <= 0 ? 'Decreased' : 'Increased',
        variant: expenseChange <= 0 ? 'success' : expenseChange < previousTotals.expenses * 0.1 ? 'info' : 'warning',
        trend: expenseChange <= 0 ? 'down' : 'up',
      },
      {
        label: 'Net Position',
        value: formatAmount(net, { compact: true, showCurrency: true }),
        change: netChange >= 0 ? 'Improved' : 'Declined',
        variant: net >= 0 ? 'success' : 'danger',
        trend: netChange >= 0 ? 'up' : 'down',
      },
      {
        label: 'Current Month',
        value: `${currentData.length} periods`,
        change: `${currentData.length >= previousData.length ? '+' : ''}${currentData.length - previousData.length}`,
        variant: 'info',
        trend: currentData.length >= previousData.length ? 'up' : 'down',
      },
    ];
  }, [currentData, previousData]);

  return (
    <Tile className="p-4">
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Quick Insights</h3>
        <p className="text-sm text-slate-500">Key financial indicators for this month</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">{insight.label}</span>
              <Badge variant={insight.variant} size="sm">
                {insight.trend === 'up' ? '↗' : insight.trend === 'down' ? '↘' : '→'}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-slate-900 tabular-nums">{insight.value}</div>
              {insight.change && <div className="text-xs text-slate-500 font-medium">{insight.change}</div>}
            </div>
          </div>
        ))}
      </div>
    </Tile>
  );
};

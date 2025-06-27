import dayjs from 'dayjs';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { Badge, Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery, useApiTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface PeriodInsightData {
  label: string;
  value: string;
  change?: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

interface TransactionPeriodInsightsWidgetProps {
  startDate: string;
  endDate: string;
  className?: string;
}

export const TransactionPeriodInsightsWidget: FC<TransactionPeriodInsightsWidgetProps> = ({
  startDate,
  endDate,
  className,
}) => {
  // Determine period type and comparison period
  const { periodType, previousStartDate, previousEndDate, periodDisplay } = useMemo(() => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const daysDiff = end.diff(start, 'day') + 1;

    let type: 'day' | 'week' | 'month' | 'year' | 'custom';
    let prevStart: dayjs.Dayjs;
    let prevEnd: dayjs.Dayjs;

    if (daysDiff === 1) {
      // Single day - compare with previous day
      type = 'day';
      prevStart = start.subtract(1, 'day');
      prevEnd = end.subtract(1, 'day');
    } else if (daysDiff <= 7) {
      // Week or less - compare with previous week
      type = 'week';
      prevStart = start.subtract(daysDiff, 'day');
      prevEnd = end.subtract(daysDiff, 'day');
    } else if (start.month() === end.month() && start.date() === 1 && end.date() === end.endOf('month').date()) {
      // Full month - compare with previous month
      type = 'month';
      prevStart = start.subtract(1, 'month');
      prevEnd = end.subtract(1, 'month').endOf('month');
    } else if (start.month() === 0 && start.date() === 1 && end.month() === 11 && end.date() === 31) {
      // Full year - compare with previous year
      type = 'year';
      prevStart = start.subtract(1, 'year');
      prevEnd = end.subtract(1, 'year');
    } else {
      // Custom period - compare with equivalent previous period
      type = 'custom';
      prevStart = start.subtract(daysDiff, 'day');
      prevEnd = end.subtract(daysDiff, 'day');
    }

    const display =
      daysDiff === 1
        ? start.format('MMM D, YYYY')
        : daysDiff <= 7
          ? `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
          : start.month() === end.month()
            ? `${start.format('MMM D')} - ${end.format('D, YYYY')}`
            : `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;

    return {
      periodType: type,
      previousStartDate: prevStart.toISOString(),
      previousEndDate: prevEnd.toISOString(),
      periodDisplay: display,
    };
  }, [startDate, endDate]);

  // Current period data
  const [currentSummaryData] = useApiSummaryTransactionsQuery({ startDate, endDate });
  const [currentTransactionsData] = useApiTransactionsQuery({ startDate, endDate, pageSize: 1000 });

  // Previous period data for comparison
  const [previousSummaryData] = useApiSummaryTransactionsQuery({
    startDate: previousStartDate,
    endDate: previousEndDate,
  });
  const [previousTransactionsData] = useApiTransactionsQuery({
    startDate: previousStartDate,
    endDate: previousEndDate,
    pageSize: 1000,
  });

  const insights = useMemo((): PeriodInsightData[] => {
    if (!currentSummaryData || !previousSummaryData) return [];

    // Calculate current period totals
    const currentTotals = currentSummaryData.reduce(
      (acc, period) => ({
        income: acc.income + (period.totalIncome ?? 0),
        expenses: acc.expenses + (period.totalExpenses ?? 0),
      }),
      { income: 0, expenses: 0 }
    );

    // Calculate previous period totals
    const previousTotals = previousSummaryData.reduce(
      (acc, period) => ({
        income: acc.income + (period.totalIncome ?? 0),
        expenses: acc.expenses + (period.totalExpenses ?? 0),
      }),
      { income: 0, expenses: 0 }
    );

    const currentNet = currentTotals.income - currentTotals.expenses;
    const previousNet = previousTotals.income - previousTotals.expenses;
    const netChange = currentNet - previousNet;

    const incomeChange = currentTotals.income - previousTotals.income;
    const expenseChange = currentTotals.expenses - previousTotals.expenses;

    const currentTransactionCount = currentTransactionsData?.totalItems ?? 0;
    const previousTransactionCount = previousTransactionsData?.totalItems ?? 0;
    const transactionCountChange = currentTransactionCount - previousTransactionCount;

    return [
      {
        label: 'Total Income',
        value: formatAmount(currentTotals.income, {
          compact: true,
          showCurrency: true,
          type: 'income',
        }),
        change: `Earned ${formatAmount(Math.abs(incomeChange), {
          compact: true,
          showCurrency: true,
          type: incomeChange >= 0 ? 'income' : 'expense',
        })} ${incomeChange >= 0 ? 'more' : 'less'}`,
        variant: incomeChange >= 0 ? 'success' : 'danger',
        trend: incomeChange >= 0 ? 'up' : 'down',
        icon: incomeChange >= 0 ? TrendingUp : TrendingDown,
        iconColor: 'text-sage-600',
      },
      {
        label: 'Total Expenses',
        value: formatAmount(currentTotals.expenses, {
          compact: true,
          showCurrency: true,
          type: currentTotals.expenses >= 0 ? 'expense' : 'income',
        }),
        change: `Spent ${formatAmount(Math.abs(expenseChange), {
          compact: true,
          showCurrency: true,
          type: expenseChange >= 0 ? 'income' : 'expense',
        })} ${expenseChange >= 0 ? 'more' : 'less'}`,
        variant: expenseChange <= 0 ? 'success' : 'danger',
        trend: expenseChange <= 0 ? 'up' : 'down',
        icon: expenseChange <= 0 ? TrendingDown : TrendingUp,
        iconColor: 'text-coral-600',
      },
      // ...existing net amount section...
      {
        label: 'Net Amount',
        value: formatAmount(currentNet, {
          compact: true,
          showCurrency: true,
          type: currentNet >= 0 ? 'income' : 'expense',
        }),
        change: `Performance ${netChange >= 0 ? 'improved' : 'declined'} by ${formatAmount(Math.abs(netChange), {
          compact: true,
          showCurrency: true,
          type: netChange >= 0 ? 'income' : 'expense',
        })}`,
        variant: netChange >= 0 ? 'success' : 'danger',
        trend: netChange >= 0 ? 'up' : 'down',
        icon: netChange >= 0 ? TrendingUp : TrendingDown,
        iconColor: currentNet >= 0 ? 'text-sage-600' : 'text-coral-600',
      },
      {
        label: 'Total Transactions',
        value: `${currentTransactionCount}`,
        change: `${Math.abs(transactionCountChange)} ${transactionCountChange >= 0 ? 'more' : 'fewer'} activities`,
        variant: transactionCountChange >= 0 ? 'success' : 'danger',
        trend: transactionCountChange >= 0 ? 'up' : 'down',
        icon: transactionCountChange >= 0 ? TrendingUp : TrendingDown,
        iconColor: 'text-mist-600',
      },
    ];
  }, [
    currentSummaryData,
    previousSummaryData,
    currentTransactionsData,
    previousTransactionsData,
    startDate,
    endDate,
    periodType,
  ]);

  return (
    <Tile className={`p-4 md:p-6 ${className ?? ''}`}>
      <div className="space-y-1 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-coral-100 rounded-lg">
            <Calendar className="h-5 w-5 text-coral-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900">Period Analysis</h3>
            <p className="text-sm text-slate-500">{periodDisplay}</p>
            <p className="text-xs text-slate-400 font-medium">Quick insights compared to previous period</p>
          </div>
        </div>
      </div>

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

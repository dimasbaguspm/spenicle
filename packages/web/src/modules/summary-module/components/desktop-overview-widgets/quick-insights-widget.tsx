import { Icon, Text, Tile, type IconProps } from '@dimasbaguspm/versaur/primitive';
import { TrendingUp, TrendingDown, PercentDiamondIcon, Activity } from 'lucide-react';
import { useMemo } from 'react';

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
        iconColor: savingsRate >= 20 ? 'secondary' : savingsRate >= 10 ? 'tertiary' : 'primary',
      },
      {
        label: 'Transactions',
        value: currentTotals.transactionCount.toString(),
        icon: Activity,
        iconColor: 'tertiary',
      },
      {
        label: 'Income',
        value: formatAmount(currentTotals.income, { compact: true, hidePrefix: true }),
        icon: TrendingUp,
        iconColor: 'secondary',
      },
      {
        label: 'Expenses',
        value: formatAmount(currentTotals.expenses, { compact: true, hidePrefix: true }),
        icon: TrendingDown,
        iconColor: 'primary',
      },
    ];
  }, [currentData]);

  return (
    <Tile>
      <div className="space-y-1 mb-4">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Quick Insights
        </Text>
        <Text as="p" fontSize="sm">
          Key financial indicators for {state.currentPeriodDisplay}
        </Text>
      </div>

      {/* desktop grid layout for insights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <Tile key={index} className="space-y-3">
              <div className="flex gap-2">
                <Icon as={IconComponent} size="sm" color={insight.iconColor as IconProps['color']} />
                <Text as="span" fontSize="xs" fontWeight="medium" ellipsis clamp={1}>
                  {insight.label}
                </Text>
              </div>
              <Text fontSize="lg" fontWeight="bold">
                {insight.value}
              </Text>
            </Tile>
          );
        })}
      </div>
    </Tile>
  );
};

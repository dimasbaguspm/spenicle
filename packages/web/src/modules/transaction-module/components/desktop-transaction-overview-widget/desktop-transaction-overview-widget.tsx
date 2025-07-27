import { Icon, Text, Tile, type IconProps } from '@dimasbaguspm/versaur/primitive';
import { TrendingUp, TrendingDown, Activity, PercentDiamondIcon } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { useApiSummaryTransactionsQuery, useApiTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface DesktopTransactionInsight {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: IconProps['color'];
}

export interface DesktopTransactionOverviewWidgetProps {
  startDate: string;
  endDate: string;
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
}

/**
 * DesktopTransactionOverviewWidget displays essential transaction metrics in a desktop-optimized layout.
 * Shows comprehensive transaction analytics with financial summaries in a compact format.
 * Designed for desktop users who need quick transaction insights at a glance.
 */
export const DesktopTransactionOverviewWidget: FC<DesktopTransactionOverviewWidgetProps> = ({
  startDate,
  endDate,
  title = 'Overview',
  subtitle,
  description = 'Essential transaction metrics and financial summary',
  className,
}) => {
  const [summaryData] = useApiSummaryTransactionsQuery({ startDate, endDate });
  const [transactionsData] = useApiTransactionsQuery({ startDate, endDate, pageSize: 1000 });

  // calculate comprehensive transaction insights
  const insights = useMemo((): DesktopTransactionInsight[] => {
    // current period financial totals
    const totalIncome = (summaryData ?? []).reduce((sum, summary) => sum + (summary.totalIncome ?? 0), 0);
    const totalExpenses = (summaryData ?? []).reduce((sum, summary) => sum + (summary.totalExpenses ?? 0), 0);
    const netAmount = totalIncome - totalExpenses;
    const totalTransactions = transactionsData?.totalItems ?? 0;

    // calculate savings rate
    const savingsRate = totalIncome > 0 ? (netAmount / totalIncome) * 100 : 0;

    return [
      {
        label: 'Savings Rate',
        value: `${savingsRate.toFixed(1)}%`,
        icon: PercentDiamondIcon,
        iconColor: savingsRate >= 20 ? 'secondary' : savingsRate >= 10 ? 'tertiary' : 'primary',
      },
      {
        label: 'Total Transactions',
        value: totalTransactions.toString(),
        icon: Activity,
        iconColor: totalTransactions > 0 ? 'secondary' : 'tertiary',
      },
      {
        label: 'Income',
        value: formatAmount(totalIncome, { compact: true, hidePrefix: true }),
        icon: TrendingUp,
        iconColor: totalIncome > 0 ? 'secondary' : 'primary',
      },
      {
        label: 'Expenses',
        value: formatAmount(totalExpenses, { compact: true, hidePrefix: true }),
        icon: TrendingDown,
        iconColor: totalExpenses > 0 ? 'primary' : 'secondary',
      },
    ];
  }, [summaryData, transactionsData]);

  return (
    <Tile className={`p-4 md:p-6 ${className ?? ''}`}>
      <div className="space-y-6">
        <div className="space-y-1">
          <Text as="h4">{title}</Text>
          {subtitle && <Text as="h6">{subtitle}</Text>}
          {subtitle && <p className="text-base font-medium text-slate-700">{subtitle}</p>}
          <Text as="p">{description}</Text>
        </div>

        {/* responsive grid layout for insights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;

            return (
              <Tile key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon as={IconComponent} color={insight.iconColor} size="sm" />
                    <Text as="span" ellipsis fontSize="xs" fontWeight="medium">
                      {insight.label}
                    </Text>
                  </div>
                </div>
                <div className="space-y-1">
                  <Text as="span" fontSize="lg" fontWeight="bold">
                    {insight.value}
                  </Text>
                </div>
              </Tile>
            );
          })}
        </div>
      </div>
    </Tile>
  );
};

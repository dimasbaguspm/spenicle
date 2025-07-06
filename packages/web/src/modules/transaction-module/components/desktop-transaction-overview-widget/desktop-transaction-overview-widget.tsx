import { TrendingUp, TrendingDown, Activity, PercentDiamondIcon } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { Tile } from '../../../../components';
import { useApiSummaryTransactionsQuery, useApiTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface DesktopTransactionInsight {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
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
        iconColor: savingsRate >= 20 ? 'text-sage-600' : savingsRate >= 10 ? 'text-mist-600' : 'text-coral-600',
      },
      {
        label: 'Total Transactions',
        value: totalTransactions.toString(),
        icon: Activity,
        iconColor: totalTransactions > 0 ? 'text-mist-600' : 'text-slate-400',
      },
      {
        label: 'Income',
        value: formatAmount(totalIncome, { compact: true, hidePrefix: true }),
        icon: TrendingUp,
        iconColor: 'text-sage-600',
      },
      {
        label: 'Expenses',
        value: formatAmount(totalExpenses, { compact: true, hidePrefix: true }),
        icon: TrendingDown,
        iconColor: 'text-coral-600',
      },
    ];
  }, [summaryData, transactionsData]);

  return (
    <Tile className={`p-4 md:p-6 ${className ?? ''}`}>
      <div className="space-y-6">
        {/* header */}
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-base font-medium text-slate-700">{subtitle}</p>}
          <p className="text-sm text-slate-500">{description}</p>
        </div>

        {/* responsive grid layout for insights */}
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
      </div>
    </Tile>
  );
};

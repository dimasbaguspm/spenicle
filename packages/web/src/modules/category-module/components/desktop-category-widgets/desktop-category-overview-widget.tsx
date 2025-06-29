import dayjs from 'dayjs';
import { Layers, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { Tile, Tab } from '../../../../components';
import { useApiCategoriesQuery, useApiSummaryCategoriesQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

export type PeriodType = 'today' | 'week' | 'month';

interface DesktopCategoryInsight {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

/**
 * DesktopCategoryOverviewWidget displays essential category metrics in a desktop-optimized layout.
 * Shows comprehensive category analytics with period selection and financial summaries.
 * Designed for desktop users who need detailed category insights at a glance.
 */
export const DesktopCategoryOverviewWidget: FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const now = dayjs();

  const [categoriesData] = useApiCategoriesQuery({ pageSize: 1000 });

  // calculate date ranges for different periods
  const { startDate, endDate, periodLabel } = useMemo(() => {
    switch (selectedPeriod) {
      case 'today':
        return {
          startDate: now.startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString(),
          periodLabel: 'Today',
        };
      case 'week':
        return {
          startDate: now.startOf('week').toISOString(),
          endDate: now.endOf('week').toISOString(),
          periodLabel: 'This Week',
        };
      case 'month':
      default:
        return {
          startDate: now.startOf('month').toISOString(),
          endDate: now.endOf('month').toISOString(),
          periodLabel: now.format('MMMM YYYY'),
        };
    }
  }, [selectedPeriod, now]);

  const [summaryData] = useApiSummaryCategoriesQuery({
    startDate,
    endDate,
  });

  const categories = categoriesData?.items ?? [];

  // calculate comprehensive category insights
  const insights = useMemo((): DesktopCategoryInsight[] => {
    // current period financial totals
    const currentPeriodIncome = (summaryData ?? []).reduce((sum, summary) => sum + (summary.totalIncome ?? 0), 0);
    const currentPeriodExpenses = (summaryData ?? []).reduce((sum, summary) => sum + (summary.totalExpenses ?? 0), 0);
    const totalTransactions = (summaryData ?? []).reduce((sum, summary) => sum + (summary.totalTransactions ?? 0), 0);

    return [
      {
        label: 'Total Categories',
        value: categories.length.toString(),
        icon: Layers,
        iconColor: 'text-mist-600',
      },
      {
        label: 'Transactions',
        value: totalTransactions.toString(),
        icon: DollarSign,
        iconColor: totalTransactions > 0 ? 'text-sage-600' : 'text-slate-400',
      },
      {
        label: 'Income',
        value: formatAmount(currentPeriodIncome, { compact: true, hidePrefix: true }),
        icon: TrendingUp,
        iconColor: 'text-sage-600',
      },
      {
        label: 'Expenses',
        value: formatAmount(currentPeriodExpenses, { compact: true, hidePrefix: true }),
        icon: TrendingDown,
        iconColor: 'text-coral-600',
      },
    ];
  }, [categories, summaryData, periodLabel]);

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-6">
        {/* header with period selection */}
        <div className="flex flex-row justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900">Overview</h3>
            <p className="text-sm text-slate-500">Comprehensive category analytics and financial summary</p>
          </div>

          <div>
            <Tab value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)} type="tabs">
              <Tab.List className="grid grid-cols-3 gap-1 p-1 bg-mist-100 rounded-lg w-fit">
                <Tab.Trigger
                  value="today"
                  className="text-center text-sm font-medium px-4 py-2 rounded-md transition-all whitespace-nowrap"
                >
                  Today
                </Tab.Trigger>
                <Tab.Trigger
                  value="week"
                  className="text-center text-sm font-medium px-4 py-2 rounded-md transition-all whitespace-nowrap"
                >
                  This Week
                </Tab.Trigger>
                <Tab.Trigger
                  value="month"
                  className="text-center text-sm font-medium px-4 py-2 rounded-md transition-all whitespace-nowrap"
                >
                  This Month
                </Tab.Trigger>
              </Tab.List>
            </Tab>
          </div>
        </div>

        {/* desktop grid layout for insights */}
        <div className="grid grid-cols-4 gap-4">
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

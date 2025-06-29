import dayjs from 'dayjs';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { Tile, Badge } from '../../../../components';
import { useApiAccountsQuery, useApiSummaryAccountsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface DesktopAccountInsight {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  variant?: 'success' | 'danger' | 'warning' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

/**
 * DesktopAccountOverviewWidget displays essential financial metrics in a desktop-optimized layout.
 * Shows straightforward information: total accounts, combined balance, and current month income/expenses.
 * Designed for desktop users who need quick financial overview at a glance.
 */
export const DesktopAccountOverviewWidget: FC = () => {
  const now = dayjs();
  const currentMonth = now.startOf('month');

  const [accountsData] = useApiAccountsQuery();
  const [currentMonthSummary] = useApiSummaryAccountsQuery({
    startDate: currentMonth.toISOString(),
    endDate: currentMonth.endOf('month').toISOString(),
  });

  const accounts = accountsData?.items ?? [];

  // calculate essential financial insights with trends
  const insights = useMemo((): DesktopAccountInsight[] => {
    // calculate total balance across all accounts
    const totalBalance = accounts.reduce((sum, account) => sum + (account.amount ?? 0), 0);

    // current month financial totals
    const currentMonthIncome = (currentMonthSummary ?? []).reduce(
      (sum, summary) => sum + (summary.totalIncome ?? 0),
      0
    );
    const currentMonthExpenses = (currentMonthSummary ?? []).reduce(
      (sum, summary) => sum + (summary.totalExpenses ?? 0),
      0
    );

    return [
      {
        label: 'Total Accounts',
        value: accounts.length.toString(),
        icon: DollarSign,
        iconColor: 'text-mist-600',
      },
      {
        label: 'Total Balance',
        value: formatAmount(totalBalance, { compact: true, hidePrefix: true }),
        icon: Wallet,
        iconColor: totalBalance >= 0 ? 'text-sage-600' : 'text-coral-600',
      },
      {
        label: 'This Month Income',
        value: formatAmount(currentMonthIncome, { compact: true, hidePrefix: true }),
        icon: TrendingUp,
        iconColor: 'text-sage-600',
      },
      {
        label: 'This Month Expenses',
        value: formatAmount(currentMonthExpenses, { compact: true, hidePrefix: true }),
        icon: TrendingDown,
        iconColor: 'text-coral-600',
      },
    ];
  }, [accounts, currentMonthSummary]);

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Overview</h3>
          <p className="text-sm text-slate-500">Key financial metrics for {now.format('MMMM YYYY')}</p>
        </div>

        {/* desktop-optimized grid: 5 columns on large screens, 3 on medium, 2 on small */}
        <div className="grid grid-cols-4  gap-4">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            return (
              <div key={index} className="space-y-3 p-4 rounded-lg border border-mist-100 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-4 w-4 ${insight.iconColor}`} />
                    <span className="text-xs font-medium text-slate-600 truncate">{insight.label}</span>
                  </div>
                  {insight.trend && insight.trend !== 'neutral' && insight.variant && (
                    <Badge variant={insight.variant} size="sm">
                      {insight.trend === 'up' ? '↗' : '↘'}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{insight.value}</div>
                  {insight.change && (
                    <div className="text-xs text-slate-500 font-medium truncate">{insight.change}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Tile>
  );
};

import dayjs from 'dayjs';
import { useMemo, type FC } from 'react';

import { Tile } from '../../../../components';
import { useApiAccountsQuery, useApiSummaryAccountsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

interface AccountInsight {
  label: string;
  value: string;
}

/**
 * MobileAccountInsightsWidget displays essential financial metrics in a mobile-optimized layout.
 * Shows total accounts, combined balance, and current month income/expenses with trend indicators.
 */
export const MobileAccountInsightsWidget: FC = () => {
  const now = dayjs();
  const currentMonth = now.startOf('month');
  const previousMonth = now.subtract(1, 'month').startOf('month');

  const [accountsData] = useApiAccountsQuery();
  const [currentMonthSummary] = useApiSummaryAccountsQuery({
    startDate: currentMonth.toISOString(),
    endDate: currentMonth.endOf('month').toISOString(),
  });
  const [previousMonthSummary] = useApiSummaryAccountsQuery({
    startDate: previousMonth.toISOString(),
    endDate: previousMonth.endOf('month').toISOString(),
  });

  const accounts = accountsData?.items ?? [];

  // calculate essential financial insights
  const insights = useMemo((): AccountInsight[] => {
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
      },
      {
        label: 'Total Balance',
        value: formatAmount(totalBalance, { compact: true, hidePrefix: true }),
      },
      {
        label: 'This Month Income',
        value: formatAmount(currentMonthIncome, {
          compact: true,
          hidePrefix: true,
        }),
      },
      {
        label: 'This Month Expenses',
        value: formatAmount(currentMonthExpenses, {
          compact: true,
          hidePrefix: true,
        }),
      },
    ];
  }, [accounts, currentMonthSummary, previousMonthSummary]);

  return (
    <Tile className="p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Overview</h3>
          <p className="text-sm text-slate-500">Key metrics for {now.format('MMMM YYYY')}</p>
        </div>

        {/* mobile-optimized 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {insights.map((insight, index) => {
            return (
              <div key={index} className="p-3 rounded-lg border border-mist-100 bg-white">
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{insight.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{insight.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Tile>
  );
};

import { TrendingDown, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { Tile, Badge } from '../../../../components';
import { useApiAccountsQuery, useApiTransactionsQuery } from '../../../../hooks';

/**
 * AccountOverviewWidget displays key account metrics and insights.
 * Shows total accounts, account health, and basic financial summaries.
 */
export const AccountOverviewWidget: FC = () => {
  const [accountsData] = useApiAccountsQuery();
  const [transactionsData] = useApiTransactionsQuery({ pageSize: 100 }); // get recent transactions for analysis

  const accounts = accountsData?.items ?? [];
  const transactions = transactionsData?.items ?? [];

  // calculate overview metrics
  const overviewMetrics = useMemo(() => {
    // account type breakdown
    const typeBreakdown = accounts.reduce(
      (breakdown, account) => {
        const type = account.type?.toLowerCase() ?? 'unknown';
        breakdown[type] = (breakdown[type] ?? 0) + 1;
        return breakdown;
      },
      {} as Record<string, number>
    );

    // calculate account activity (accounts with recent transactions)
    const accountActivityMap = new Map<number, number>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    transactions.forEach((transaction) => {
      if (transaction.accountId && transaction.date) {
        const transactionDate = new Date(transaction.date);
        if (transactionDate >= thirtyDaysAgo) {
          const currentCount = accountActivityMap.get(transaction.accountId) ?? 0;
          accountActivityMap.set(transaction.accountId, currentCount + 1);
        }
      }
    });

    const activeAccounts = accountActivityMap.size;
    const inactiveAccounts = accounts.length - activeAccounts;

    // identify accounts that might need attention
    const accountsNeedingAttention = accounts.filter((account) => {
      const hasRecentActivity = account.id ? accountActivityMap.has(account.id) : false;
      const hasIncompleteInfo = !account.type || !account.name;
      return !hasRecentActivity || hasIncompleteInfo;
    });

    return {
      totalAccounts: accounts.length,
      typeBreakdown,
      activeAccounts,
      inactiveAccounts,
      accountsNeedingAttention: accountsNeedingAttention.length,
      recentTransactionCount: transactions.length,
    };
  }, [accounts, transactions]);

  const getAccountHealthStatus = () => {
    const { totalAccounts, activeAccounts, accountsNeedingAttention } = overviewMetrics;

    if (totalAccounts === 0) return { status: 'neutral', message: 'No accounts yet' };
    if (accountsNeedingAttention > totalAccounts * 0.5)
      return { status: 'warning', message: 'Some accounts need attention' };
    if (activeAccounts / totalAccounts >= 0.7) return { status: 'success', message: 'Accounts are active' };
    return { status: 'info', message: 'Account activity is moderate' };
  };

  const healthStatus = getAccountHealthStatus();

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Account Overview</h3>
          <p className="text-sm text-slate-500">Summary of your account portfolio</p>
        </div>

        {/* main metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* total accounts */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-coral-600" />
              <span className="text-sm font-medium text-slate-600">Total Accounts</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{overviewMetrics.totalAccounts}</p>
          </div>

          {/* active accounts */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-sage-600" />
              <span className="text-sm font-medium text-slate-600">Active</span>
            </div>
            <p className="text-2xl font-bold text-sage-700">{overviewMetrics.activeAccounts}</p>
          </div>

          {/* inactive accounts */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-mist-600" />
              <span className="text-sm font-medium text-slate-600">Inactive</span>
            </div>
            <p className="text-2xl font-bold text-mist-700">{overviewMetrics.inactiveAccounts}</p>
          </div>

          {/* accounts needing attention */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-coral-600" />
              <span className="text-sm font-medium text-slate-600">Need Attention</span>
            </div>
            <p className="text-2xl font-bold text-coral-700">{overviewMetrics.accountsNeedingAttention}</p>
          </div>
        </div>

        {/* account health status */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Account Health</p>
              <p className="text-xs text-slate-500">{healthStatus.message}</p>
            </div>
          </div>
          <Badge
            variant={
              healthStatus.status === 'success'
                ? 'success'
                : healthStatus.status === 'warning'
                  ? 'warning'
                  : healthStatus.status === 'info'
                    ? 'info'
                    : 'default'
            }
          >
            {healthStatus.status === 'success'
              ? 'Healthy'
              : healthStatus.status === 'warning'
                ? 'Needs Attention'
                : healthStatus.status === 'info'
                  ? 'Moderate'
                  : 'Neutral'}
          </Badge>
        </div>

        {/* account type breakdown */}
        {Object.keys(overviewMetrics.typeBreakdown).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-900">Account Types</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(overviewMetrics.typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {type === 'unknown' ? 'Other' : type}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* recent activity summary */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Recent Activity</span>
            <span className="text-sm font-medium text-slate-900">
              {overviewMetrics.recentTransactionCount} transactions (30 days)
            </span>
          </div>
        </div>
      </div>
    </Tile>
  );
};

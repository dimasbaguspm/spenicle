import { createFileRoute } from '@tanstack/react-router';

import { Button, PageLayout, Skeleton } from '../../../components';
import { useApiSummaryQuery, useApiTransactionsQuery, useApiAccountsQuery } from '../../../hooks';
import type { Transaction, Account } from '../../../types/api';

export const Route = createFileRoute('/_protected/_experienced-user/')({
  component: HomeComponent,
});

function HomeComponent() {
  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Fetch financial summary for current month
  const [summaryData, summaryError, summaryState] = useApiSummaryQuery({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });

  // Fetch recent transactions (last 5)
  const [transactionsData, , transactionsState] = useApiTransactionsQuery({
    pageSize: 5,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Fetch accounts for balance overview
  const [accountsData] = useApiAccountsQuery({
    pageSize: 10,
  });

  // Calculate totals from summary data
  const totalBalance =
    summaryData?.summary?.accountBalances?.reduce(
      (sum: number, account: { balance: number }) => sum + (account.balance ?? 0),
      0
    ) ?? 0;

  const monthlyIncome = summaryData?.summary?.totalIncome ?? 0;
  const monthlyExpenses = summaryData?.summary?.totalExpenses ?? 0;
  const netIncome = summaryData?.summary?.netIncome ?? 0;

  return (
    <PageLayout>
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Welcome Back!</h1>
        <p className="text-slate-600">Manage your expenses and track your spending</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Total Balance</h3>
          {summaryState.isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">This Month</h3>
          {summaryState.isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="space-y-1">
              <p className={`text-xl sm:text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netIncome >= 0 ? '+' : ''}${Math.abs(netIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Income: ${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Expenses: $
                {monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Account Balances */}
      {accountsData?.items && accountsData.items.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Account Balances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summaryData?.summary?.accountBalances
              ?.slice(0, 4)
              .map((account: { accountId: string; accountName: string; balance: number }) => (
                <div key={account.accountId} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 text-sm sm:text-base">{account.accountName}</p>
                    <p className="text-xs sm:text-sm text-slate-500 capitalize">
                      {accountsData.items?.find((acc) => acc.id === parseInt(account.accountId))?.type}
                    </p>
                  </div>
                  <p
                    className={`font-bold text-sm sm:text-base ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="coral" className="w-full h-12 text-base">
            Add Transaction
          </Button>
          <Button variant="outline" className="w-full h-12 text-base">
            View Analytics
          </Button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h3>
        {transactionsState.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : transactionsData?.items && transactionsData.items.length > 0 ? (
          <div className="space-y-3">
            {transactionsData.items.map((transaction: Transaction) => {
              const account = accountsData?.items?.find((acc: Account) => acc.id === transaction.accountId);
              const isIncome = (transaction.amount ?? 0) > 0;
              const formattedDate = transaction.date
                ? new Date(transaction.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0 min-h-[44px]"
                >
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-slate-900 text-sm sm:text-base leading-tight">
                      {transaction.note ?? `Transaction #${transaction.id}`}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 leading-tight">
                      {formattedDate} • {account?.name ?? 'Unknown Account'}
                    </p>
                  </div>
                  <p
                    className={`font-bold text-sm sm:text-base ${isIncome ? 'text-green-600' : 'text-red-600'} text-right`}
                  >
                    {isIncome ? '+' : '-'}$
                    {Math.abs(transaction.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm sm:text-base">No recent transactions found</p>
            <Button variant="coral" className="mt-4 h-12 text-base">
              Add Your First Transaction
            </Button>
          </div>
        )}
      </div>

      {/* Error States */}
      {summaryError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm sm:text-base">Failed to load financial summary. Please try again.</p>
        </div>
      )}
    </PageLayout>
  );
}

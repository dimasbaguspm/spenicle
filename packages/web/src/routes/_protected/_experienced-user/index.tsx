import { createFileRoute } from '@tanstack/react-router';

import { Button, PageLayout, Skeleton } from '../../../components';
import { useApiTransactionsQuery, useApiAccountsQuery } from '../../../hooks';
import type { Transaction, Account } from '../../../types/api';

export const Route = createFileRoute('/_protected/_experienced-user/')({
  component: HomeComponent,
});

function HomeComponent() {
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

  return (
    <PageLayout>
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Welcome Back!</h1>
        <p className="text-slate-600">Manage your expenses and track your spending</p>
      </div>

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
    </PageLayout>
  );
}

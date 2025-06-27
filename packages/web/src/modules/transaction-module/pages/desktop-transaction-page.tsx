import dayjs from 'dayjs';
import { Plus, Activity } from 'lucide-react';
import { useState, useMemo, type FC } from 'react';

import { PageLayout, Tile, Button, Pagination } from '../../../components';
import { DatePickerInline } from '../../../components/date-picker';
import { DRAWER_IDS, DRAWER_METADATA_KEYS } from '../../../constants/drawer-id';
import { useApiAccountsQuery, useApiCategoriesQuery, useApiTransactionsQuery } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import { TransactionFilterInline } from '../components/transaction-filter-inline';
import { TransactionPeriodInsightsWidget } from '../components/transaction-period-insights-widget';
import { TransactionTable } from '../components/transaction-table';
import { useTransactionFilters } from '../hooks';
import {
  createAccountsMap,
  createCategoriesMap,
  convertApiTransactionToSeamlessTransactionFormat,
} from '../hooks/use-seamless-transactions/helpers';
import type { SeamlessTransaction } from '../hooks/use-seamless-transactions/types';

export const DesktopTransactionPage: FC = () => {
  const [date, setDate] = useState(dayjs());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { accountIds, categoryIds, types } = useTransactionFilters();
  const { openDrawer } = useDrawerRouterProvider();

  const [pagedAccounts] = useApiAccountsQuery({ pageSize: 1000 });
  const [pagedCategories] = useApiCategoriesQuery({ pageSize: 1000 });
  const [pagedTransactions] = useApiTransactionsQuery({
    startDate: date.startOf('day').toISOString(),
    endDate: date.endOf('day').toISOString(),
    accountIds,
    categoryIds,
    types,
    pageNumber: currentPage,
    pageSize,
  });

  const transactions = pagedTransactions?.items ?? [];
  const accounts = pagedAccounts?.items ?? [];
  const categories = pagedCategories?.items ?? [];
  const totalPages = Math.ceil((pagedTransactions?.totalItems ?? 0) / pageSize);

  // create maps for efficient lookup
  const accountsMap = useMemo(() => createAccountsMap(accounts), [accounts]);
  const categoriesMap = useMemo(() => createCategoriesMap(categories), [categories]);

  // transform transactions to seamless format
  const seamlessTransactions = useMemo(
    () =>
      transactions.map((transaction) =>
        convertApiTransactionToSeamlessTransactionFormat(transaction, accountsMap, categoriesMap)
      ),
    [transactions, accountsMap, categoriesMap]
  );

  const handleOnAddTransaction = async () => {
    await openDrawer(DRAWER_IDS.CREATE_TRANSACTION, {
      [DRAWER_METADATA_KEYS.DATE]: date.toISOString(),
    });
  };

  const handleOpenEditTransaction = async (seamlessTransaction: SeamlessTransaction) => {
    await openDrawer(DRAWER_IDS.EDIT_TRANSACTION, {
      [DRAWER_METADATA_KEYS.TRANSACTION_ID]: seamlessTransaction.transaction.id,
    });
  };

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        {/* header with quick actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Daily Transactions</h1>
            <p className="text-slate-500">{date.format('dddd, MMMM D, YYYY')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="coral" size="sm" onClick={handleOnAddTransaction}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* main content grid */}
        <div className="grid grid-cols-[300px_1fr] gap-6">
          {/* left sidebar with date picker and filters */}
          <div className="flex flex-col gap-4">
            <div className="sticky top-4 flex flex-col gap-4">
              {/* date picker */}
              <Tile className="p-4">
                <DatePickerInline
                  autoSubmitOnSelect
                  onChange={(value) => {
                    setDate(dayjs(value));
                    setCurrentPage(1); // reset to first page when date changes
                  }}
                  value={date.toDate()}
                />
              </Tile>
              <Tile className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Filters</h3>
                <TransactionFilterInline />
              </Tile>
            </div>
          </div>

          {/* main content area */}
          <div className="flex flex-col gap-4">
            {/* daily comparison insights - just the cards */}
            <TransactionPeriodInsightsWidget
              startDate={date.startOf('day').toISOString()}
              endDate={date.endOf('day').toISOString()}
              showHeader={false}
            />

            {/* transactions table */}
            <Tile className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Daily Transactions ({pagedTransactions?.totalItems ?? 0})
                </h3>
              </div>

              {seamlessTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-mist-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-600 mb-2">No transactions found</h4>
                  <p className="text-slate-500 mb-4">{date.format('MMMM D, YYYY')} has no transactions yet.</p>
                  <Button variant="coral" onClick={handleOnAddTransaction}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Transaction
                  </Button>
                </div>
              ) : (
                <>
                  <TransactionTable
                    transactions={seamlessTransactions}
                    onTransactionClick={handleOpenEditTransaction}
                  />

                  {/* pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                  )}
                </>
              )}
            </Tile>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

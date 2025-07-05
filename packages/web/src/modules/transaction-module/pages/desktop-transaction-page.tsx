import { useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, useMemo, type FC } from 'react';

import { PageLayout } from '../../../components';
import { DRAWER_IDS, DRAWER_METADATA_KEYS } from '../../../constants/drawer-id';
import { useApiAccountsQuery, useApiCategoriesQuery, useApiTransactionsQuery } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import { DesktopTransactionOverviewWidget } from '../components/desktop-transaction-overview-widget';
import { DesktopTransactionSidebar } from '../components/desktop-transaction-sidebar';
import { DesktopTransactionTableSection } from '../components/desktop-transaction-table-section';
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
  const [sortField, setSortField] = useState<keyof SeamlessTransaction>('transaction');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 10;
  const router = useRouter();
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

  // sort seamless transactions
  const sortedTransactions = useMemo(() => {
    return [...seamlessTransactions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'transaction':
          // For amount sorting
          aValue = a.transaction.amount ?? 0;
          bValue = b.transaction.amount ?? 0;
          break;
        case 'category':
          // For category name sorting
          aValue = a.category?.name?.toLowerCase() ?? 'zzz';
          bValue = b.category?.name?.toLowerCase() ?? 'zzz';
          break;
        case 'account':
          // For account name sorting
          aValue = a.account?.name?.toLowerCase() ?? 'zzz';
          bValue = b.account?.name?.toLowerCase() ?? 'zzz';
          break;
        default:
          // For time/date sorting
          aValue = a.transaction.date ? new Date(a.transaction.date).getTime() : 0;
          bValue = b.transaction.date ? new Date(b.transaction.date).getTime() : 0;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [seamlessTransactions, sortField, sortDirection]);

  const handleSort = (field: keyof SeamlessTransaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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

  const handleOpenFilterDrawer = async () => {
    await openDrawer(DRAWER_IDS.FILTER_TRANSACTION);
  };

  const handleDateChange = (newDate: dayjs.Dayjs) => {
    setDate(newDate);
    setCurrentPage(1); // reset to first page when date changes
  };

  const handleClearAllFilters = async () => {
    // Clear search params by navigating to the same route without search params
    await router.navigate({ to: '/', search: {}, replace: true });
    setCurrentPage(1); // reset to first page when filters are cleared
  };

  return (
    <PageLayout background="cream" title="Transaction" showBackButton>
      <div className="flex flex-col gap-6">
        {/* main content grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* left sidebar with date picker and filters */}
          <DesktopTransactionSidebar
            date={date}
            onDateChange={handleDateChange}
            onAddTransaction={handleOnAddTransaction}
          />

          {/* main content area */}
          <div className="col-span-9 space-y-6">
            {/* daily transaction insights */}
            <DesktopTransactionOverviewWidget
              startDate={date.startOf('day').toISOString()}
              endDate={date.endOf('day').toISOString()}
            />

            {/* transactions table */}
            <DesktopTransactionTableSection
              date={date}
              transactions={sortedTransactions}
              accountIds={accountIds}
              categoryIds={categoryIds}
              types={types}
              accounts={accounts}
              categories={categories}
              sortConfig={{ field: sortField, direction: sortDirection }}
              currentPage={currentPage}
              totalPages={totalPages}
              onTransactionClick={handleOpenEditTransaction}
              onFilterClick={handleOpenFilterDrawer}
              onClearAllFilters={handleClearAllFilters}
              onTransactionEdit={handleOpenEditTransaction}
              onSort={handleSort}
              onPageChange={setCurrentPage}
              onAddTransaction={handleOnAddTransaction}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

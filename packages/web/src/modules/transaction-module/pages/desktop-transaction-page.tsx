import dayjs, { Dayjs } from 'dayjs';
import { useState, type FC } from 'react';

import { PageLayout, Skeleton, Tile } from '../../../components';
import { DatePickerInline } from '../../../components/date-picker';
import { DRAWER_IDS, DRAWER_METADATA_KEYS } from '../../../constants/drawer-id';
import { useApiAccountsQuery, useApiCategoriesQuery, useApiTransactionsQuery } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import type { Transaction } from '../../../types/api';
import { TransactionCalendar } from '../components/transaction-calendar';
import { TransactionFilterInline } from '../components/transaction-filter-inline';
import { useTransactionFilters } from '../hooks';

export const DesktopTransactionPage: FC = () => {
  const [date, setDate] = useState(dayjs());
  const { accountIds, categoryIds } = useTransactionFilters();
  const { openDrawer } = useDrawerRouterProvider();

  const [pagedAccounts, , { isLoading: isAccountsLoading }] = useApiAccountsQuery({ pageSize: 1000 });
  const [pagedCategories, , { isLoading: isCategoriesLoading }] = useApiCategoriesQuery({ pageSize: 1000 });
  const [pagedTransactions, , { isLoading: isTransactionsLoading }] = useApiTransactionsQuery({
    startDate: date.startOf('day').toISOString(),
    endDate: date.endOf('day').toISOString(),
    accountIds,
    categoryIds,
  });

  const transactions = pagedTransactions?.items ?? [];
  const accounts = pagedAccounts?.items ?? [];
  const categories = pagedCategories?.items ?? [];

  const handleOnAddTransaction = async (passedDate: Dayjs) => {
    await openDrawer(DRAWER_IDS.CREATE_TRANSACTION, {
      [DRAWER_METADATA_KEYS.DATE]: passedDate.toISOString(),
    });
  };

  const handleOpenEditTransaction = async (transactionId: Transaction) => {
    await openDrawer(DRAWER_IDS.EDIT_TRANSACTION, {
      [DRAWER_METADATA_KEYS.TRANSACTION_ID]: transactionId.id,
    });
  };

  const isDataLoading = isAccountsLoading || isCategoriesLoading || isTransactionsLoading;

  return (
    <PageLayout>
      <Tile className="grid grid-cols-[minmax(250px,30%)_1fr]">
        <div className="p-4">
          <div className="sticky top-4 flex flex-col gap-4 bg-white z-10">
            <DatePickerInline autoSubmitOnSelect onChange={(value) => setDate(dayjs(value))} value={date.toDate()} />
            <TransactionFilterInline />
          </div>
        </div>
        <div className="p-4 flex flex-col flex-wrap overflow-y-auto min-h-screen">
          {isDataLoading ? (
            <Skeleton className="h-8 w-1/2 mb-4" />
          ) : (
            <TransactionCalendar
              data={transactions}
              accounts={accounts}
              categories={categories}
              selectedDate={date}
              onAddTransaction={handleOnAddTransaction}
              onTransactionClick={handleOpenEditTransaction}
            />
          )}
        </div>
      </Tile>
    </PageLayout>
  );
};

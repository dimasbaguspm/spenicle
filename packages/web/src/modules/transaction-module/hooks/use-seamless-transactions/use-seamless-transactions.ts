import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo, useCallback, useRef, useState } from 'react';

import { useApiAccountsQuery } from '../../../../hooks/use-api/built-in/use-accounts';
import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiGetTransactionsMutation } from '../../../../hooks/use-api/built-in/use-transactions';
import type { Transaction, TransactionQueryParameters } from '../../../../types/api';

import {
  generateDateRange,
  createAccountsMap,
  createCategoriesMap,
  groupTransactionsByDate,
  convertApiTransactionToSeamlessTransactionFormat,
} from './helpers';
import type { SeamlessTransaction } from './types';

export interface UseSeamlessTransactionsParams {
  selectedDate: Dayjs;
  groupId?: number;
  accountId?: number;
  categoryId?: number;
  type?: 'expense' | 'income' | 'transfer';
  isHighlighted?: boolean;
  onSuccessLoadInitial?: () => void;
}

export function useSeamlessTransactions({
  selectedDate,
  groupId,
  accountId,
  categoryId,
  type,
  isHighlighted = false,
  onSuccessLoadInitial,
}: UseSeamlessTransactionsParams) {
  const [currentDate, setCurrentDate] = useState<Dayjs>(selectedDate);
  const queryClient = useQueryClient();

  const lastEndDate = useRef<string | null>(null);

  const [accountsData] = useApiAccountsQuery();
  const [categoriesData] = useApiCategoriesQuery();
  const [getTransactions] = useApiGetTransactionsMutation();

  const accountsMap = useMemo(() => createAccountsMap(accountsData?.items), [accountsData?.items]);
  const categoriesMap = useMemo(() => createCategoriesMap(categoriesData?.items), [categoriesData?.items]);

  const queryKey = ['transactions', 'seamless', currentDate, accountId, categoryId, type, isHighlighted];

  const fetchFormattedTransactions = async (
    fetchStartDate: string,
    fetchEndDate: string
  ): Promise<[string, SeamlessTransaction[]][]> => {
    const queryParams: TransactionQueryParameters = {
      startDate: fetchStartDate,
      endDate: fetchEndDate,
      groupId,
      accountIds: [accountId!],
      types: [type!],
      categoryIds: [categoryId!],
      sortBy: 'date' as const,
      sortOrder: 'desc' as const,
      pageSize: 1000,
    };

    const response = await getTransactions(queryParams);

    const formattedTransactions =
      (response.items as Transaction[])?.map((apiTransaction) =>
        convertApiTransactionToSeamlessTransactionFormat(apiTransaction, accountsMap, categoriesMap)
      ) ?? [];

    const allDates = generateDateRange(dayjs(fetchStartDate), dayjs(fetchEndDate));
    const transactionsByDate = groupTransactionsByDate(formattedTransactions, allDates);

    return transactionsByDate;
  };

  const fetchMore = useCallback(async (): Promise<void> => {
    const lastDate = lastEndDate.current;
    if (!lastDate) return;

    const fetchStartDate = dayjs(lastDate).subtract(8, 'day').startOf('day').toISOString();
    const fetchEndDate = dayjs(lastDate).subtract(4, 'day').endOf('day').toISOString();

    const newData = await fetchFormattedTransactions(fetchStartDate, fetchEndDate);

    queryClient.setQueryData(queryKey, (prev: [string, SeamlessTransaction[]][] | undefined) => {
      const currentData = prev ?? [];
      const mergedData = new Map<string, SeamlessTransaction[]>();

      currentData.forEach(([date, transactions]) => {
        mergedData.set(date, transactions);
      });

      newData.forEach(([date, transactions]) => {
        mergedData.set(date, transactions);
      });

      return Array.from(mergedData.entries()).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    });

    lastEndDate.current = fetchEndDate;
  }, [queryClient, queryKey, fetchFormattedTransactions, accountsMap, categoriesMap, getTransactions]);

  const {
    data: transactionsByDate = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const startDate = currentDate.subtract(4, 'day').toISOString();
      const endDate = currentDate.endOf('day').toISOString();

      lastEndDate.current = endDate;

      const data = await fetchFormattedTransactions(startDate, endDate);

      onSuccessLoadInitial?.();
      return data;
    },
    enabled: !!(accountsData && categoriesData),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const refetch = (passedDate: string) => {
    setCurrentDate(dayjs(passedDate));
  };

  return {
    // Data
    transactionsByDate,

    // State
    isLoading,
    isError,
    error: error instanceof Error ? error.message : error ? String(error) : null,

    // Actions
    refreshTransactions: refetch,
    fetchMore,
  };
}

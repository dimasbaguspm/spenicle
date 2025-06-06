import dayjs, { type Dayjs } from 'dayjs';

import type { Transaction, Account, Category } from '../../../../types/api';

import type { SeamlessTransaction } from './types';

/**
 * Formats a Date object to API-compatible date string (YYYY-MM-DD)
 */
function formatDate(date: Dayjs): string {
  return date.startOf('day').toISOString();
}

/**
 * Generates an array of date strings between start and end dates (inclusive)
 */
export function generateDateRange(start: Dayjs, end: Dayjs): string[] {
  const dates: string[] = [];
  let currentDate = dayjs(start).startOf('day');

  while (currentDate.isSameOrBefore(end, 'date')) {
    dates.push(formatDate(currentDate));
    currentDate = currentDate.add(1, 'day');
  }

  return dates;
}

/**
 * Converts an API Transaction to a Seamless Transaction format
 */
export function convertApiTransactionToSeamlessTransactionFormat(
  transaction: Transaction,
  accountsMap: Map<number, Account>,
  categoriesMap: Map<number, Category>
): SeamlessTransaction {
  const account = transaction.accountId ? accountsMap.get(transaction.accountId)! : null;
  const category = transaction.categoryId ? categoriesMap.get(transaction.categoryId)! : null;

  return {
    transaction,
    category,
    account,
  };
}

/**
 * Creates a Map from an array of accounts for quick lookup by ID
 */
export function createAccountsMap(accounts: Account[] | undefined): Map<number, Account> {
  const map = new Map<number, Account>();
  accounts?.forEach((account) => {
    if (account.id) {
      map.set(account.id, account);
    }
  });
  return map;
}

/**
 * Creates a Map from an array of categories for quick lookup by ID
 */
export function createCategoriesMap(categories: Category[] | undefined): Map<number, Category> {
  const map = new Map<number, Category>();
  categories?.forEach((category) => {
    if (category.id) {
      map.set(category.id, category);
    }
  });
  return map;
}

/**
 * Groups transactions by date, ensuring all dates in the range are present
 * Returns an array of tuples in the format [date, transactions[]]
 */
export function groupTransactionsByDate(
  SeamlessTransaction: SeamlessTransaction[],
  dateRange: string[]
): [string, SeamlessTransaction[]][] {
  const transactionsByDate: Record<string, SeamlessTransaction[]> = {};

  // Initialize all dates with empty arrays
  dateRange.forEach((date) => {
    transactionsByDate[date] = [];
  });

  // Group transactions by their date
  SeamlessTransaction.forEach((seamlessTransaction) => {
    const transactionDate = formatDate(dayjs(seamlessTransaction.transaction.date));
    if (transactionsByDate[transactionDate]) {
      transactionsByDate[transactionDate].push(seamlessTransaction);
    }
  });

  // Convert to array of tuples and sort by date (future dates first, then today, then past)
  return Object.entries(transactionsByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
}

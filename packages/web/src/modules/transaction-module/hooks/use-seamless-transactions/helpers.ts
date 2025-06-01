import dayjs, { type Dayjs } from 'dayjs';

import type { Transaction as ApiTransaction, Account, Category } from '../../../../types/api';
import { type Transaction } from '../../components/transaction-card';

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
 * Gets an appropriate icon for a transaction based on category or transaction type
 */
export function getTransactionIcon(
  category: Category | null | undefined,
  transactionType: 'income' | 'expense' | 'transfer'
): string {
  // Handle transfer transactions first
  if (transactionType === 'transfer') return '🔄';

  if (category?.name) {
    const categoryName = category.name.toLowerCase();
    if (categoryName.includes('food') || categoryName.includes('dining')) return '🍽️';
    if (categoryName.includes('transport') || categoryName.includes('car')) return '🚗';
    if (categoryName.includes('shopping')) return '🛍️';
    if (categoryName.includes('entertainment')) return '🎬';
    if (categoryName.includes('bill') || categoryName.includes('utility')) return '📄';
    if (categoryName.includes('health')) return '🏥';
    if (categoryName.includes('education')) return '📚';
    if (categoryName.includes('travel')) return '✈️';
  }
  return transactionType === 'income' ? '💰' : '💳';
}

/**
 * Converts an API Transaction to a component Transaction format
 */
export function convertApiTransactionToComponent(
  apiTransaction: ApiTransaction,
  accountsMap: Map<number, Account>,
  categoriesMap: Map<number, Category>
): Transaction {
  const account = apiTransaction.accountId ? accountsMap.get(apiTransaction.accountId) : null;
  const category = apiTransaction.categoryId ? categoriesMap.get(apiTransaction.categoryId) : null;

  // Use the transaction type from the API directly
  const transactionType = apiTransaction.type ?? 'expense';
  const isIncome = transactionType === 'income';
  const isTransfer = transactionType === 'transfer';

  // Get proper title from note or create a default based on category
  const title = apiTransaction.note ?? category?.name ?? 'Transaction';

  // Set appropriate colors based on transaction type
  const getIconColors = () => {
    if (isIncome) return { bgColor: 'bg-green-100', textColor: 'text-green-600' };
    if (isTransfer) return { bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
    return { bgColor: 'bg-red-100', textColor: 'text-red-600' };
  };

  const { bgColor, textColor } = getIconColors();

  return {
    id: apiTransaction.id?.toString() ?? '',
    title,
    amount: Math.abs(apiTransaction.amount ?? 0),
    type: transactionType,
    category: category?.name ?? 'General',
    paymentMethod: account?.name ?? 'Unknown Account',
    icon: getTransactionIcon(category, transactionType),
    iconBgColor: bgColor,
    iconTextColor: textColor,
    date: new Date(apiTransaction.date ?? new Date()),
    balance: undefined, // This would need to be calculated or provided by the API
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
export function groupTransactionsByDate(transactions: Transaction[], dateRange: string[]): [string, Transaction[]][] {
  const transactionsByDate: Record<string, Transaction[]> = {};

  // Initialize all dates with empty arrays
  dateRange.forEach((date) => {
    transactionsByDate[date] = [];
  });

  // Group transactions by their date
  transactions.forEach((transaction) => {
    const transactionDate = formatDate(dayjs(transaction.date));
    if (transactionsByDate[transactionDate]) {
      transactionsByDate[transactionDate].push(transaction);
    }
  });

  // Convert to array of tuples and sort by date (future dates first, then today, then past)
  return Object.entries(transactionsByDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
}

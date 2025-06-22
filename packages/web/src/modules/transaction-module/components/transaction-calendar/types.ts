import type { Transaction, Account, Category } from '../../../../types/api';

// local data model for calendar slot items
export interface TransactionCalendarItem {
  transaction: Transaction;
  account: Account;
  category: Category;
}

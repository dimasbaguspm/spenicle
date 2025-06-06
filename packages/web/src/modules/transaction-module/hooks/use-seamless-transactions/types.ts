import type { Account, Category, Transaction } from '../../../../types/api';

export interface SeamlessTransaction {
  transaction: Transaction;
  category: Category | null;
  account: Account | null;
}

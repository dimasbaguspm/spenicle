export interface TransactionFiltersFormSchema {
  groupId?: number;
  accountId?: number;
  categoryId?: number;
  type?: 'expense' | 'income' | 'transfer';
  isHighlighted?: boolean;
}

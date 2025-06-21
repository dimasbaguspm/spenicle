export interface TransactionFiltersFormSchema {
  groupId?: number;
  accountIds?: number[];
  categoryIds?: number[];
  types?: ('expense' | 'income' | 'transfer')[];
}

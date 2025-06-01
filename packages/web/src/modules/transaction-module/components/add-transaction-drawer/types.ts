export interface AddTransactionFormData {
  groupId: number;
  accountId: number;
  categoryId: number;
  createdByUserId: number;
  amount: number;
  currency: string;
  type: 'expense' | 'income' | 'transfer';
  date: string;
  note: string | null;
  recurrenceId: number | null;
}

export interface AddTransactionDrawerProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

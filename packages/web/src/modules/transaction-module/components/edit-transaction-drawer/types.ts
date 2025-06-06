import type { UpdateTransaction, Transaction } from '../../../../types/api';

export type EditTransactionFormData = Omit<UpdateTransaction, 'currency'>;

export interface EditTransactionDrawerProps {
  transaction: Transaction;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

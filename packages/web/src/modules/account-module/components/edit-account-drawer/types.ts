import type { UpdateAccount, Account } from '../../../../types/api';

export interface EditAccountFormData extends UpdateAccount {
  enableLimit: boolean;
  limitPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  limitAmount: number;
  metadata?: {
    icon?: string;
    color?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

export interface EditAccountDrawerProps {
  account: Account;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

import type { NewAccount } from '../../../../types/api';

export interface AddAccountFormData extends NewAccount {
  enableLimit: boolean;
  limitPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  limitAmount: number;
  metadata?: {
    icon?: string;
    color?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

export interface AddAccountDrawerProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

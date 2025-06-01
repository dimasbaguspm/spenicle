import type { UpdateAccount, UpdateAccountLimit, Account, AccountLimit } from '../../../../types/api';

import type { EditAccountFormData } from './types';

export const getDefaultFormValues = (account: Account, accountLimit?: AccountLimit): Partial<EditAccountFormData> => ({
  groupId: account.groupId,
  name: account.name ?? '',
  type: account.type ?? 'checking',
  note: account.note,
  enableLimit: !!accountLimit,
  limitPeriod: accountLimit?.period === 'week' ? 'weekly' : 'monthly',
  limitAmount: accountLimit?.limit ?? 0,
  metadata: {
    icon: account.metadata?.icon ?? 'credit-card',
    color: account.metadata?.color ?? 'coral',
    ...account.metadata,
  },
});

export const VALIDATION_RULES = {
  groupId: {
    required: 'Group is required',
  },
  name: {
    required: 'Account name is required',
    maxLength: {
      value: 255,
      message: 'Account name must be less than 255 characters',
    },
  },
  type: {
    required: 'Account type is required',
    maxLength: {
      value: 50,
      message: 'Account type must be less than 50 characters',
    },
  },
  note: {
    maxLength: {
      value: 500,
      message: 'Notes must be less than 500 characters',
    },
  },
  enableLimit: {
    // No validation needed for boolean field
  },
  limitAmount: {
    min: {
      value: 0.01,
      message: 'Limit amount must be greater than 0',
    },
    validate: (value: number, formData: EditAccountFormData) => {
      if (formData.enableLimit && (!value || value <= 0)) {
        return 'Limit amount is required when limit is enabled';
      }
      return true;
    },
  },
  limitPeriod: {
    validate: (value: string, formData: EditAccountFormData) => {
      if (formData.enableLimit && !value) {
        return 'Period is required when limit is enabled';
      }
      return true;
    },
  },
  metadata: {
    // No validation needed for metadata, can be empty
  },
};

/**
 * Account type options for the select dropdown
 */
export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking Account' },
  { value: 'savings', label: 'Savings Account' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment Account' },
  { value: 'loan', label: 'Loan Account' },
];

/**
 * Period options for account limits
 */
export const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

/**
 * Transforms form data to API format for account update
 */
export const transformToAccountData = (data: EditAccountFormData): UpdateAccount => ({
  groupId: data.groupId,
  name: data.name,
  type: data.type,
  note: data.note,
  metadata: data.metadata,
});

/**
 * Maps our form period values to API period values
 */
export const mapPeriodToApiFormat = (period: 'daily' | 'weekly' | 'monthly' | 'yearly'): 'month' | 'week' => {
  switch (period) {
    case 'daily':
    case 'weekly':
      return 'week';
    case 'monthly':
    case 'yearly':
      return 'month';
    default:
      return 'month';
  }
};

/**
 * Transforms form data to API format for account limit update
 */
export const transformToAccountLimitData = (data: EditAccountFormData, accountId: number): UpdateAccountLimit => ({
  accountId,
  period: mapPeriodToApiFormat(data.limitPeriod),
  limit: data.limitAmount,
});

/**
 * Transforms form data to API format for account limit creation
 */
export const transformToNewAccountLimitData = (data: EditAccountFormData, accountId: number) => ({
  accountId,
  period: mapPeriodToApiFormat(data.limitPeriod),
  limit: data.limitAmount,
});

/**
 * Validates if the form data is ready for submission
 */
export const validateFormData = (data: EditAccountFormData): { isValid: boolean; error?: string } => {
  if (!data.groupId) {
    return { isValid: false, error: 'Group is required' };
  }

  if (!data.name?.trim()) {
    return { isValid: false, error: 'Account name is required' };
  }

  if (!data.type?.trim()) {
    return { isValid: false, error: 'Account type is required' };
  }

  if (data.enableLimit) {
    if (!data.limitAmount || data.limitAmount <= 0) {
      return { isValid: false, error: 'Limit amount must be greater than 0 when limit is enabled' };
    }

    if (!data.limitPeriod) {
      return { isValid: false, error: 'Period is required when limit is enabled' };
    }
  }

  return { isValid: true };
};

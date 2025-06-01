import type { NewAccount, NewAccountLimit } from '../../../../types/api';

import type { AddAccountFormData } from './types';

export const DEFAULT_FORM_VALUES: Partial<AddAccountFormData> = {
  name: '',
  type: 'checking',
  note: null,
  enableLimit: false,
  limitPeriod: 'monthly',
  limitAmount: 0,
  metadata: {
    icon: 'credit-card',
    color: 'coral',
  },
};

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
    validate: (value: number, formData: AddAccountFormData) => {
      if (formData.enableLimit && (!value || value <= 0)) {
        return 'Limit amount is required when limit is enabled';
      }
      return true;
    },
  },
  limitPeriod: {
    validate: (value: string, formData: AddAccountFormData) => {
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
 * Transforms form data to API format for account creation
 */
export const transformToAccountData = (data: AddAccountFormData): NewAccount => ({
  groupId: data.groupId, // Will be validated before calling this function
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
 * Transforms form data to API format for account limit creation
 */
export const transformToAccountLimitData = (data: AddAccountFormData, accountId: number): NewAccountLimit => ({
  accountId,
  period: mapPeriodToApiFormat(data.limitPeriod),
  limit: data.limitAmount,
});

/**
 * Validates if the form data is ready for submission
 */
export const validateFormData = (data: AddAccountFormData): { isValid: boolean; error?: string } => {
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

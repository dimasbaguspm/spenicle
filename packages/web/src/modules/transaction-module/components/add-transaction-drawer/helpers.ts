import type { NewTransaction } from '../../../../types/api';

import type { AddTransactionFormData } from './types';

export const DEFAULT_FORM_VALUES: Partial<AddTransactionFormData> = {
  amount: 0,
  type: 'expense',
  date: new Date().toISOString(), // Current datetime in ISO format
  note: null,
  recurrenceId: null,
};

export const VALIDATION_RULES = {
  groupId: {
    required: 'Group is required',
  },
  accountId: {
    required: 'Account is required',
  },
  categoryId: {
    required: 'Category is required',
  },
  createdByUserId: {
    required: 'User is required',
  },
  amount: {
    required: 'Amount is required',
    min: {
      value: 0.01,
      message: 'Amount must be greater than 0',
    },
  },
  type: {
    required: 'Transaction type is required',
  },
  date: {
    required: 'Date is required',
  },
  time: {
    required: 'Time is required',
  },
  note: {
    maxLength: {
      value: 500,
      message: 'Notes must be less than 500 characters',
    },
  },
  recurrenceId: {
    // No validation needed for optional field
  },
};

/**
 * Currency options for the select dropdown
 */
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

/**
 * Validates form data before submission
 */
export const validateFormData = (data: AddTransactionFormData): { isValid: boolean; error?: string } => {
  if (!data.groupId) {
    return { isValid: false, error: 'Group is required' };
  }

  if (!data.accountId) {
    return { isValid: false, error: 'Account is required' };
  }

  if (!data.categoryId) {
    return { isValid: false, error: 'Category is required' };
  }

  if (!data.createdByUserId) {
    return { isValid: false, error: 'User is required' };
  }

  if (!data.amount || data.amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (!data.date) {
    return { isValid: false, error: 'Date is required' };
  }

  return { isValid: true };
};

/**
 * Transforms form data to API format for transaction creation
 */
export const transformToTransactionData = (data: AddTransactionFormData): NewTransaction => ({
  groupId: data.groupId,
  accountId: data.accountId,
  categoryId: data.categoryId,
  createdByUserId: data.createdByUserId,
  amount: data.amount,
  currency: 'USD', // always hardcoded
  type: data.type,
  date: data.date,
  note: data.note,
  recurrenceId: data.recurrenceId,
});

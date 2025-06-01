import { TrendingDown, TrendingUp, ArrowRightLeft } from 'lucide-react';
import React from 'react';

import type { UpdateTransaction, Transaction } from '../../../../types/api';

import type { EditTransactionFormData } from './types';

/**
 * Gets default form values from existing transaction data
 */
export const getDefaultFormValues = (transaction: Transaction): EditTransactionFormData => ({
  groupId: transaction.groupId,
  accountId: transaction.accountId,
  categoryId: transaction.categoryId,
  createdByUserId: transaction.createdByUserId,
  amount: transaction.amount,
  currency: transaction.currency,
  type: transaction.type ?? 'expense',
  date: transaction.date,
  note: transaction.note,
  recurrenceId: transaction.recurrenceId,
});

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
  currency: {
    required: 'Currency is required',
    minLength: {
      value: 3,
      message: 'Currency must be exactly 3 characters (e.g., USD, EUR)',
    },
    maxLength: {
      value: 3,
      message: 'Currency must be exactly 3 characters (e.g., USD, EUR)',
    },
    pattern: {
      value: /^[A-Z]{3}$/,
      message: 'Currency must be 3 uppercase letters (e.g., USD, EUR)',
    },
  },
  type: {
    required: 'Transaction type is required',
  },
  date: {
    required: 'Date is required',
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
 * Transaction type options for the segment control
 */
export const TRANSACTION_TYPE_OPTIONS = [
  {
    value: 'expense' as const,
    label: 'Expense',
    icon: React.createElement(TrendingDown, { className: 'w-4 h-4' }),
  },
  {
    value: 'income' as const,
    label: 'Income',
    icon: React.createElement(TrendingUp, { className: 'w-4 h-4' }),
  },
  {
    value: 'transfer' as const,
    label: 'Transfer',
    icon: React.createElement(ArrowRightLeft, { className: 'w-4 h-4' }),
  },
];

/**
 * Validates form data before submission
 */
export const validateFormData = (data: EditTransactionFormData): { isValid: boolean; error?: string } => {
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

  if (!data.currency || data.currency.length !== 3) {
    return { isValid: false, error: 'Currency must be exactly 3 characters' };
  }

  if (!data.date) {
    return { isValid: false, error: 'Date is required' };
  }

  return { isValid: true };
};

/**
 * Transforms form data to API format for transaction update
 */
export const transformToTransactionData = (data: EditTransactionFormData): UpdateTransaction => ({
  groupId: data.groupId,
  accountId: data.accountId,
  categoryId: data.categoryId,
  createdByUserId: data.createdByUserId,
  amount: data.amount,
  currency: data.currency,
  type: data.type,
  date: data.date,
  note: data.note,
  recurrenceId: data.recurrenceId,
});

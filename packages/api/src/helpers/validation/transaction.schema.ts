import { z } from 'zod';

import { NewTransaction, UpdateTransaction } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating a transaction
export const createTransactionSchema = z.object({
  groupId: z.number().int().positive('Group ID is required'),
  accountId: z.number().int().positive('Account ID is required'),
  categoryId: z.number().int().positive('Category ID is required'),
  createdByUserId: z.number().int().positive('Created by User ID is required'),
  amount: z.number().positive('Amount must be a positive number'),
  currency: z.string().length(3, 'Currency code must be 3 characters'),
  type: z.string().refine((val) => ['expense', 'income', 'transfer'].includes(val), {
    message: 'Transaction type must be one of: expense, income, transfer',
  }),
  isHighlighted: z.boolean().optional(),
  date: z.string(), // DB is date, accept string (ISO)
  note: z.string().nullable().optional(),
  recurrenceId: z.number().int().nullable().optional(), // nullable in DB, so optional here
});

// Schema for updating a transaction
export const updateTransactionSchema = createTransactionSchema.partial();

// Schema for transaction query parameters
export const transactionQuerySchema = z.object({
  id: z.number().int().optional(),
  groupId: z.number().int().positive().optional(),
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().optional(),
  createdByUserId: z.number().int().optional(),
  isHighlighted: z.boolean().optional(),
  note: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || val.length > 0, { message: 'Note must be a non-empty string' }),
  startDate: z
    .string()
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), { message: 'Invalid start date format' }),
  endDate: z
    .string()
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), { message: 'Invalid end date format' }),
  currency: z.string().length(3).optional(),
  type: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['expense', 'income', 'transfer'].includes(val), {
      message: 'Transaction type must be one of: expense, income, transfer',
    }),
  recurrenceId: z.number().int().positive().optional(),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .refine((val) => val === undefined || ['date', 'amount', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: date, amount, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

// Schema for deleting a transaction
export const deleteTransactionSchema = z.object({
  id: z.number().int().positive('Transaction ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>, CreateTransactionInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateTransaction, 'id' | 'createdAt' | 'updatedAt'>, UpdateTransactionInput>>();

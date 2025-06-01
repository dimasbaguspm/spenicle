import { z } from 'zod';

import { NewAccountLimit, UpdateAccountLimit } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating an account limit
export const createAccountLimitSchema = z.object({
  accountId: z.number().int().positive('Account ID is required'),
  period: z
    .string()
    .refine((val) => ['month', 'week'].includes(val), { message: 'Period must be either "month" or "week"' }),
  limit: z
    .number()
    .min(0, 'Limit must be a non-negative number')
    .transform((val) => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'string') return parseFloat(val);
      return val;
    })
    .default(0),
});

// Schema for updating an account limit
export const updateAccountLimitSchema = createAccountLimitSchema.partial();

// Schema for account limit query parameters
export const accountLimitQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  accountId: z.number().int().positive().optional(),
  period: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['month', 'week'].includes(val), {
      message: 'Period must be either "month" or "week"',
    }),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['period', 'limit', 'startDate', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: period, limit, startDate, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

// Schema for deleting an account limit
export const deleteAccountLimitSchema = z.object({
  id: z.number().int().positive('Account Limit ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateAccountLimitInput = z.infer<typeof createAccountLimitSchema>;
export type UpdateAccountLimitInput = z.infer<typeof updateAccountLimitSchema>;
export type AccountLimitQueryInput = z.infer<typeof accountLimitQuerySchema>;
export type DeleteAccountLimitInput = z.infer<typeof deleteAccountLimitSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewAccountLimit, 'id' | 'createdAt' | 'updatedAt'>, CreateAccountLimitInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateAccountLimit, 'id' | 'createdAt' | 'updatedAt'>, UpdateAccountLimitInput>>();

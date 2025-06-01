import { z } from 'zod';

import { NewAccount, UpdateAccount } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating an account
export const createAccountSchema = z.object({
  groupId: z.number().int().positive('Group ID is required'),
  name: z.string().max(255, 'Name must be at most 255 characters').min(1, 'Name is required'),
  type: z.string().max(50, 'Type must be at most 50 characters').min(1, 'Account type is required'),
  metadata: z.object({}).passthrough().or(z.null()).optional().nullable(),
  note: z.string().optional().nullable(),
});

// Schema for updating an account
export const updateAccountSchema = createAccountSchema
  .omit({
    groupId: true,
  })
  .partial();

// Schema for account query parameters
export const accountQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  name: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  type: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['name', 'type', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: name, type, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

// Schema for deleting an account
export const deleteAccountSchema = z.object({
  id: z.number().int().positive('Account ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountQueryInput = z.infer<typeof accountQuerySchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewAccount, 'id' | 'createdAt' | 'updatedAt'>, CreateAccountInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateAccount, 'id' | 'createdAt' | 'updatedAt'>, UpdateAccountInput>>();

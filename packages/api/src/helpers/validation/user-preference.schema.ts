import { z } from 'zod';

import { NewUserPreference, UpdateUserPreference } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

const periodOptions = ['weekly', 'monthly', 'annually'] as const;

export const createUserPreferenceSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  monthlyStartDate: z
    .number()
    .int()
    .min(1, 'Monthly start date must be between 1 and 31')
    .max(31, 'Monthly start date must be between 1 and 31')
    .default(25),
  weeklyStartDay: z
    .number()
    .int()
    .min(0, 'Weekly start day must be between 0 (Sunday) and 6 (Saturday)')
    .max(6, 'Weekly start day must be between 0 (Sunday) and 6 (Saturday)')
    .default(1),
  limitPeriod: z.coerce
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => periodOptions.includes(val as (typeof periodOptions)[number]), {
      message: 'Category period must be one of: weekly, monthly, annually',
    })
    .default('monthly'),
  categoryPeriod: z
    .string()
    .transform((val) => val.toLowerCase())
    .refine((val) => periodOptions.includes(val as (typeof periodOptions)[number]), {
      message: 'Category period must be one of: weekly, monthly, annually',
    })
    .default('monthly'),
});

export const updateUserPreferenceSchema = createUserPreferenceSchema
  .omit({
    userId: true,
  })
  .partial();

export const userPreferenceQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  monthlyStartDate: z.number().int().min(1).max(31).optional(),
  weeklyStartDay: z.number().int().min(0).max(6).optional(),
  limitPeriod: z.enum(periodOptions).optional(),
  categoryPeriod: z.enum(periodOptions).optional(),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const deleteUserPreferenceSchema = z.object({
  id: z.number().int().positive('User ID is required'),
});

export type CreateUserPreferenceInput = z.infer<typeof createUserPreferenceSchema>;
export type UpdateUserPreferenceInput = z.infer<typeof updateUserPreferenceSchema>;
export type UserPreferenceQueryInput = z.infer<typeof userPreferenceQuerySchema>;
export type DeleteUserPreferenceInput = z.infer<typeof deleteUserPreferenceSchema>;

typeAssertion<
  TypeEqualityGuard<Omit<NewUserPreference, 'id' | 'createdAt' | 'updatedAt'>, CreateUserPreferenceInput>
>();
typeAssertion<
  TypeEqualityGuard<Omit<UpdateUserPreference, 'id' | 'createdAt' | 'updatedAt'>, UpdateUserPreferenceInput>
>();

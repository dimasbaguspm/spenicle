import { z } from 'zod';

import { NewUser, UpdateUser } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating a user (without password - internal use)
export const createUserSchema = z.object({
  groupId: z.number().int().positive('Group ID is required'),
  email: z.string().email('Invalid email format').max(255, 'Email must be at most 255 characters'),
  passwordHash: z.string().min(1, 'Password hash is required').max(255, 'Password hash must be at most 255 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  isActive: z.boolean().default(true),
  isOnboard: z.boolean().default(false),
});

// Schema for updating a user
export const updateUserSchema = createUserSchema
  .omit({
    passwordHash: true,
    groupId: true,
  })
  .partial();

// Schema for user query parameters
export const userQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  name: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  isActive: z.boolean().optional(),
  isOnboard: z.boolean().optional(),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['name', 'email', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: name, email, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

// Schema for deleting a user
export const deleteUserSchema = z.object({
  id: z.number().int().positive('User ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>, CreateUserInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateUser, 'id' | 'createdAt' | 'updatedAt'>, UpdateUserInput>>();

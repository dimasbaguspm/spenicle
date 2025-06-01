import { z } from 'zod';

import { NewGroup, UpdateGroup } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating a group
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255, 'Group name must be at most 255 characters'),
  defaultCurrency: z.string().length(3, 'Currency code must be 3 characters'),
});

// Schema for updating a group
export const updateGroupSchema = createGroupSchema.partial();

// Schema for group query parameters
export const groupQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || val.length > 0, { message: 'Name must be a non-empty string' }),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['name', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: name, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

// Schema for deleting a group
export const deleteGroupSchema = z.object({
  id: z.number().int().positive('Group ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type GroupQueryInput = z.infer<typeof groupQuerySchema>;
export type DeleteGroupInput = z.infer<typeof deleteGroupSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewGroup, 'id' | 'createdAt' | 'updatedAt'>, CreateGroupInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateGroup, 'id' | 'createdAt' | 'updatedAt'>, UpdateGroupInput>>();

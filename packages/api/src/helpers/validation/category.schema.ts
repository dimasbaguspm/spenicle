import { z } from 'zod';

import { NewCategory, UpdateCategory } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating a category
export const createCategorySchema = z.object({
  groupId: z.number().int().positive('Group ID is required'),
  parentId: z.number().int().nullable().optional(), // nullable in DB, so optional here
  name: z.string().max(100, 'Name must be at most 100 characters').min(1, 'Name is required'),
  metadata: z.object({}).passthrough().or(z.null()).default(null).optional().nullable(),
  note: z.string().nullable().optional(),
});

// Schema for updating a category
export const updateCategorySchema = createCategorySchema.partial();

// Schema for category query parameters
export const categoryQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  parentId: z.number().int().nullable().optional(),
  name: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
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

// Schema for deleting a category
export const deleteCategorySchema = z.object({
  id: z.number().int().positive('Category ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewCategory, 'id' | 'createdAt' | 'updatedAt'>, CreateCategoryInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateCategory, 'id' | 'createdAt' | 'updatedAt'>, UpdateCategoryInput>>();

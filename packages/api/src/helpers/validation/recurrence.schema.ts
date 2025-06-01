import { z } from 'zod';

import { NewRecurrence, UpdateRecurrence } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

export const createRecurrenceSchema = z.object({
  frequency: z.string().refine((val) => ['daily', 'weekly', 'monthly', 'yearly'].includes(val), {
    message: 'Frequency must be one of: daily, weekly, monthly, yearly',
  }),
  interval: z.number().int().min(1, 'Interval must be a positive integer'),
  nextOccurrenceDate: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid next occurrence date format' }),
  endDate: z
    .string()
    .optional()
    .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), { message: 'Invalid end date format' })
    .nullable(),
});

export const updateRecurrenceSchema = createRecurrenceSchema.partial();

export const recurrenceQuerySchema = z.object({
  id: z.number().int().positive().optional(),
  frequency: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['frequency', 'interval', 'nextOccurrenceDate', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: frequency, interval, nextOccurrenceDate, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

export const deleteRecurrenceSchema = z.object({
  id: z.number().int().positive('Recurrence ID is required'),
});

export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;
export type UpdateRecurrenceInput = z.infer<typeof updateRecurrenceSchema>;
export type RecurrenceQueryInput = z.infer<typeof recurrenceQuerySchema>;
export type DeleteRecurrenceInput = z.infer<typeof deleteRecurrenceSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewRecurrence, 'id' | 'createdAt' | 'updatedAt'>, CreateRecurrenceInput>>();
typeAssertion<TypeEqualityGuard<Omit<UpdateRecurrence, 'id' | 'createdAt' | 'updatedAt'>, UpdateRecurrenceInput>>();

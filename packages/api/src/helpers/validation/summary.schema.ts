import { z } from 'zod';

export const summaryPeriodQuerySchema = z
  .object({
    accountId: z.number().int().positive('Account ID must be a positive integer').optional(),
    categoryId: z.number().int().positive('Category ID must be a positive integer').optional(),
    interval: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine(
        (val) => val === undefined || ['daily', 'weekly', 'monthly', 'biweekly', 'quarterly', 'yearly'].includes(val),
        {
          message: 'interval must be one of: daily, weekly, monthly, biweekly, quarterly, yearly',
        }
      ),
    startDate: z
      .string()
      .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), { message: 'Invalid startDate format' }),
    endDate: z
      .string()
      .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), { message: 'Invalid endDate format' }),
    sortBy: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || ['totalIncome', 'totalExpenses', 'totalNet'].includes(val), {
        message: 'sortBy must be one of:  totalIncome, totalExpenses, and totalNet',
      }),
    sortOrder: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
        message: 'sortOrder must be one of: asc, desc',
      }),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  });

import { z } from 'zod';

import { NewRefreshToken, UpdateRefreshToken } from '../../models/schema.ts';
import { typeAssertion, TypeEqualityGuard } from '../type-check/index.ts';

// Schema for creating a refresh token
export const createRefreshTokenSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  token: z.string().min(1, 'Token is required'),
  expires: z.string(), // DB is timestamp, accept string (ISO)
});

// Schema for updating a refresh token
export const updateRefreshTokenSchema = z.object({
  revokedAt: z.string().nullable().optional(), // nullable in DB, so nullable and optional here
  replacedByToken: z.string().nullable().optional(),
});

// Schema for refresh token query parameters
export const refreshTokenQuerySchema = z.object({
  userId: z.number().int().positive().optional(),
  token: z.string().optional(),
  isActive: z.boolean().optional(),
  pageNumber: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).optional().default(25),
  sortBy: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['userId', 'expires', 'createdAt'].includes(val), {
      message: 'sortBy must be one of: userId, expires, createdAt',
    }),
  sortOrder: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .refine((val) => val === undefined || ['asc', 'desc'].includes(val), {
      message: 'sortOrder must be one of: asc, desc',
    }),
});

// Schema for deleting a refresh token
export const deleteRefreshTokenSchema = z.object({
  id: z.number().int().positive('Refresh Token ID is required'),
});

// Export types based on the schemas for use in controllers and services
export type CreateRefreshTokenInput = z.infer<typeof createRefreshTokenSchema>;
export type UpdateRefreshTokenInput = z.infer<typeof updateRefreshTokenSchema>;
export type RefreshTokenQueryInput = z.infer<typeof refreshTokenQuerySchema>;
export type DeleteRefreshTokenInput = z.infer<typeof deleteRefreshTokenSchema>;

// Ensure type compatibility between schemas and model types
typeAssertion<TypeEqualityGuard<Omit<NewRefreshToken, 'id' | 'createdAt'>, CreateRefreshTokenInput>>();
typeAssertion<
  TypeEqualityGuard<
    Omit<UpdateRefreshToken, 'id' | 'createdAt' | 'userId' | 'token' | 'expires'>,
    UpdateRefreshTokenInput
  >
>();

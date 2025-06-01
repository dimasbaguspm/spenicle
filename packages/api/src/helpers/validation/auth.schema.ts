import { z } from 'zod';

import { createGroupSchema } from './group.schema.ts';

// Schema for user registration
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email must be at most 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  groupId: z.number().int().positive('Group ID is required'),
});

// Schema for user login
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Schema for refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Schema for logout
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Schema for combined group creation and user registration
export const registerWithGroupSchema = z.object({
  user: registerSchema.omit({ groupId: true }),
  group: createGroupSchema,
});

// Export types based on the schemas for use in controllers and services
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type RegisterWithGroupInput = z.infer<typeof registerWithGroupSchema>;

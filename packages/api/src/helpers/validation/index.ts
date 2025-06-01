import { ZodError, ZodSchema } from 'zod';

import { BadRequestException } from '../exceptions/index.ts';

export * from './auth.schema.ts';
export * from './group.schema.ts';
export * from './user.schema.ts';
export * from './category.schema.ts';
export * from './transaction.schema.ts';
export * from './account.schema.ts';
export * from './account-limit.schema.ts';
export * from './recurrence.schema.ts';
export * from './refresh-token.schema.ts';
export * from './user-preference.schema.ts';

export const validate = async <Schema>(schema: ZodSchema<Schema>, input: unknown) => {
  const output = await schema.safeParseAsync(input);

  if (!output.success) {
    throw new BadRequestException('Validation error', {
      errors: getZodErrorDetails(output.error),
    });
  }

  return output;
};

export const getZodErrorDetails = (error: ZodError) => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

export const isExist = <T>(value: T | undefined | null): value is T => {
  return (
    (value !== undefined && value !== null) ||
    (typeof value === 'object' && value !== null && Object.keys(value).length > 0) ||
    (typeof value === 'string' && value.trim() !== '') ||
    (Array.isArray(value) && value.length > 0)
  );
};

import {
  createAccountLimitSchema,
  updateAccountLimitSchema,
  accountLimitQuerySchema,
  deleteAccountLimitSchema,
} from '../account-limit.schema.ts';

describe('Account Limit Schema Validation', () => {
  describe('createAccountLimitSchema', () => {
    it('should validate valid account limit creation data', () => {
      const validData = {
        accountId: 1,
        period: 'month',
        limit: 1000,
      };

      const result = createAccountLimitSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should validate account limit with week period', () => {
      const validData = {
        accountId: 1,
        period: 'week',
        limit: 500,
      };

      const result = createAccountLimitSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should use default limit value of 0', () => {
      const validData = {
        accountId: 1,
        period: 'month',
      };

      const result = createAccountLimitSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(0);
    });

    it('should reject non-positive account ID', () => {
      const invalidData = {
        accountId: 0,
        period: 'month',
        limit: 1000,
      };

      const result = createAccountLimitSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Account ID is required',
            path: ['accountId'],
          }),
        ])
      );
    });

    it('should reject invalid period values', () => {
      const invalidData = {
        accountId: 1,
        period: 'invalid',
        limit: 1000,
      };

      const result = createAccountLimitSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Period must be either "month" or "week"',
            path: ['period'],
          }),
        ])
      );
    });

    it('should accept both valid period values', () => {
      const monthData = { accountId: 1, period: 'month' };
      const weekData = { accountId: 1, period: 'week' };

      expect(createAccountLimitSchema.safeParse(monthData).success).toBe(true);
      expect(createAccountLimitSchema.safeParse(weekData).success).toBe(true);
    });
  });

  describe('updateAccountLimitSchema', () => {
    it('should validate valid account limit update data', () => {
      const validData = {
        period: 'week',
        limit: 2000,
      };

      const result = updateAccountLimitSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow partial updates', () => {
      const validData = {
        limit: 1500,
      };

      const result = updateAccountLimitSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should not transform string limit to number', () => {
      const data = {
        limit: '1000',
      };

      const result = updateAccountLimitSchema.safeParse(data);

      expect(result.success).toBe(false);
    });

    it('should allow empty object for update', () => {
      const result = updateAccountLimitSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid limit values', () => {
      const invalidData = {
        limit: 'invalid',
      };

      const result = updateAccountLimitSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected number, received string',
          }),
        ])
      );
    });

    it('should handle null and undefined limit values', () => {
      const nullData = { limit: null };
      const undefinedData = { limit: undefined };

      const nullResult = updateAccountLimitSchema.safeParse(nullData);
      const undefinedResult = updateAccountLimitSchema.safeParse(undefinedData);

      expect(nullResult.success).toBe(false);
      expect(undefinedResult.success).toBe(true);
    });
  });

  describe('accountLimitQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        id: 1,
        accountId: 2,
        period: 'month',
        pageNumber: 2,
        pageSize: 10,
        sortBy: 'period',
        sortOrder: 'asc',
      };

      const result = accountLimitQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should use default pagination values', () => {
      const result = accountLimitQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(1);
      expect(result.data?.pageSize).toBe(25);
    });

    it('should coerce string numbers to numbers for pagination', () => {
      const data = {
        pageNumber: '3',
        pageSize: '15',
      };

      const result = accountLimitQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(3);
      expect(result.data?.pageSize).toBe(15);
    });

    it('should transform empty strings to undefined', () => {
      const data = {
        period: '',
        sortBy: '',
        sortOrder: '',
      };

      const result = accountLimitQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.period).toBeUndefined();
      expect(result.data?.sortBy).toBeUndefined();
      expect(result.data?.sortOrder).toBeUndefined();
    });

    it('should reject invalid period values', () => {
      const invalidData = {
        period: 'invalid',
      };

      const result = accountLimitQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Period must be either "month" or "week"',
          }),
        ])
      );
    });

    it('should reject invalid sortBy values', () => {
      const invalidData = {
        sortBy: 'invalid',
      };

      const result = accountLimitQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortBy must be one of: period, limit, startDate, createdAt',
          }),
        ])
      );
    });

    it('should accept valid sortBy values', () => {
      const validSortByValues = ['period', 'limit', 'startDate', 'createdAt'];

      validSortByValues.forEach((sortBy) => {
        const result = accountLimitQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid sortOrder values', () => {
      const invalidData = {
        sortOrder: 'invalid',
      };

      const result = accountLimitQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortOrder must be one of: asc, desc',
          }),
        ])
      );
    });
  });

  describe('deleteAccountLimitSchema', () => {
    it('should validate valid delete account limit data', () => {
      const validData = {
        id: 1,
      };

      const result = deleteAccountLimitSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject non-positive account limit ID', () => {
      const invalidData = {
        id: 0,
      };

      const result = deleteAccountLimitSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Account Limit ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject negative account limit ID', () => {
      const invalidData = {
        id: -1,
      };

      const result = deleteAccountLimitSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Account Limit ID is required',
            path: ['id'],
          }),
        ])
      );
    });
  });
});

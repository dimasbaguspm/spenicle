import {
  createUserPreferenceSchema,
  updateUserPreferenceSchema,
  userPreferenceQuerySchema,
  deleteUserPreferenceSchema,
} from '../user-preference.schema.ts';

describe('User Preference Schema Validation', () => {
  describe('createUserPreferenceSchema', () => {
    it('should validate valid user preference data with all fields', () => {
      const validData = {
        userId: 1,
        monthlyStartDate: 15,
        weeklyStartDay: 0,
        limitPeriod: 'weekly',
        categoryPeriod: 'annually',
      };

      const result = createUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userId: 1,
        monthlyStartDate: 15,
        weeklyStartDay: 0,
        limitPeriod: 'weekly',
        categoryPeriod: 'annually',
      });
    });

    it('should validate with defaults when optional fields are missing', () => {
      const validData = {
        userId: 1,
      };

      const result = createUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userId: 1,
        monthlyStartDate: 25,
        weeklyStartDay: 1,
        limitPeriod: 'monthly',
        categoryPeriod: 'monthly',
      });
    });

    it('should transform period strings to lowercase', () => {
      const validData = {
        userId: 1,
        limitPeriod: 'WEEKLY',
        categoryPeriod: 'MONTHLY',
      };

      const result = createUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.limitPeriod).toBe('weekly');
      expect(result.data?.categoryPeriod).toBe('monthly');
    });

    it('should reject missing userId', () => {
      const invalidData = {
        monthlyStartDate: 15,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['userId'],
          }),
        ])
      );
    });

    it('should reject invalid userId (zero)', () => {
      const invalidData = {
        userId: 0,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'User ID is required',
            path: ['userId'],
          }),
        ])
      );
    });

    it('should reject invalid userId (negative)', () => {
      const invalidData = {
        userId: -1,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'User ID is required',
            path: ['userId'],
          }),
        ])
      );
    });

    it('should reject invalid monthlyStartDate (below 1)', () => {
      const invalidData = {
        userId: 1,
        monthlyStartDate: 0,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Monthly start date must be between 1 and 31',
            path: ['monthlyStartDate'],
          }),
        ])
      );
    });

    it('should reject invalid monthlyStartDate (above 31)', () => {
      const invalidData = {
        userId: 1,
        monthlyStartDate: 32,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Monthly start date must be between 1 and 31',
            path: ['monthlyStartDate'],
          }),
        ])
      );
    });

    it('should reject invalid weeklyStartDay (below 0)', () => {
      const invalidData = {
        userId: 1,
        weeklyStartDay: -1,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Weekly start day must be between 0 (Sunday) and 6 (Saturday)',
            path: ['weeklyStartDay'],
          }),
        ])
      );
    });

    it('should reject invalid weeklyStartDay (above 6)', () => {
      const invalidData = {
        userId: 1,
        weeklyStartDay: 7,
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Weekly start day must be between 0 (Sunday) and 6 (Saturday)',
            path: ['weeklyStartDay'],
          }),
        ])
      );
    });

    it('should reject invalid limitPeriod', () => {
      const invalidData = {
        userId: 1,
        limitPeriod: 'invalid',
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Category period must be one of: weekly, monthly, annually',
            path: ['limitPeriod'],
          }),
        ])
      );
    });

    it('should reject invalid categoryPeriod', () => {
      const invalidData = {
        userId: 1,
        categoryPeriod: 'invalid',
      };

      const result = createUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Category period must be one of: weekly, monthly, annually',
            path: ['categoryPeriod'],
          }),
        ])
      );
    });

    it('should accept valid boundary values', () => {
      const validData = {
        userId: 1,
        monthlyStartDate: 1,
        weeklyStartDay: 0,
      };

      const result = createUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.monthlyStartDate).toBe(1);
      expect(result.data?.weeklyStartDay).toBe(0);
    });

    it('should accept valid upper boundary values', () => {
      const validData = {
        userId: 1,
        monthlyStartDate: 31,
        weeklyStartDay: 6,
      };

      const result = createUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.monthlyStartDate).toBe(31);
      expect(result.data?.weeklyStartDay).toBe(6);
    });
  });

  describe('updateUserPreferenceSchema', () => {
    it('should validate partial updates', () => {
      const validData = {
        monthlyStartDate: 15,
      };

      const result = updateUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        monthlyStartDate: 15,
      });
    });

    it('should validate empty update', () => {
      const validData = {};

      const result = updateUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should not include userId in update schema', () => {
      const invalidData = {
        userId: 1,
        monthlyStartDate: 15,
      };

      const result = updateUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('userId');
      expect(result.data).toEqual({
        monthlyStartDate: 15,
      });
    });

    it('should validate multiple fields update', () => {
      const validData = {
        monthlyStartDate: 20,
        weeklyStartDay: 3,
        limitPeriod: 'weekly',
        categoryPeriod: 'annually',
      };

      const result = updateUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        monthlyStartDate: 20,
        weeklyStartDay: 3,
        limitPeriod: 'weekly',
        categoryPeriod: 'annually',
      });
    });

    it('should reject invalid values in updates', () => {
      const invalidData = {
        monthlyStartDate: 32,
        weeklyStartDay: 7,
      };

      const result = updateUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['monthlyStartDate'],
          }),
          expect.objectContaining({
            path: ['weeklyStartDay'],
          }),
        ])
      );
    });
  });

  describe('userPreferenceQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        id: 1,
        userId: 2,
        monthlyStartDate: 15,
        weeklyStartDay: 1,
        limitPeriod: 'monthly',
        categoryPeriod: 'weekly',
        pageNumber: 2,
        pageSize: 10,
        sortBy: 'userId',
        sortOrder: 'desc',
      };

      const result = userPreferenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should apply defaults for pagination', () => {
      const validData = {};

      const result = userPreferenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        pageNumber: 1,
        pageSize: 25,
        sortOrder: 'asc',
      });
    });

    it('should transform empty string sortBy to undefined', () => {
      const validData = {
        sortBy: '',
      };

      const result = userPreferenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.sortBy).toBeUndefined();
    });

    it('should coerce string numbers for pageNumber and pageSize', () => {
      const validData = {
        pageNumber: '3',
        pageSize: '50',
      };

      const result = userPreferenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(3);
      expect(result.data?.pageSize).toBe(50);
    });

    it('should reject invalid enum values', () => {
      const invalidData = {
        limitPeriod: 'invalid',
        categoryPeriod: 'invalid',
        sortOrder: 'invalid',
      };

      const result = userPreferenceQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toHaveLength(3);
    });

    it('should reject negative page values', () => {
      const invalidData = {
        pageNumber: 0,
        pageSize: 0,
      };

      const result = userPreferenceQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['pageNumber'],
          }),
          expect.objectContaining({
            path: ['pageSize'],
          }),
        ])
      );
    });

    it('should validate optional filter fields', () => {
      const validData = {
        id: 1,
        userId: 2,
        monthlyStartDate: 25,
        weeklyStartDay: 1,
      };

      const result = userPreferenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...validData,
        pageNumber: 1,
        pageSize: 25,
        sortOrder: 'asc',
      });
    });
  });

  describe('deleteUserPreferenceSchema', () => {
    it('should validate valid id', () => {
      const validData = {
        id: 1,
      };

      const result = deleteUserPreferenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject missing id', () => {
      const invalidData = {};

      const result = deleteUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject invalid id (zero)', () => {
      const invalidData = {
        id: 0,
      };

      const result = deleteUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'User ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject invalid id (negative)', () => {
      const invalidData = {
        id: -1,
      };

      const result = deleteUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'User ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject non-integer id', () => {
      const invalidData = {
        id: 1.5,
      };

      const result = deleteUserPreferenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected integer, received float',
            path: ['id'],
          }),
        ])
      );
    });
  });
});

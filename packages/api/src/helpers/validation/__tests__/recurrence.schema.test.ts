import {
  createRecurrenceSchema,
  updateRecurrenceSchema,
  recurrenceQuerySchema,
  deleteRecurrenceSchema,
} from '../recurrence.schema.ts';

describe('Recurrence Schema Validation', () => {
  describe('createRecurrenceSchema', () => {
    it('should validate valid recurrence creation data', () => {
      const validData = {
        frequency: 'monthly',
        interval: 1,
        nextOccurrenceDate: '2024-06-24',
        endDate: '2024-12-31',
      };

      const result = createRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should validate recurrence without end date', () => {
      const validData = {
        frequency: 'weekly',
        interval: 2,
        nextOccurrenceDate: '2024-05-31',
      };

      const result = createRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should accept all valid frequency values', () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];

      frequencies.forEach((frequency) => {
        const data = {
          frequency,
          interval: 1,
          nextOccurrenceDate: '2024-05-24',
        };

        const result = createRecurrenceSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid frequency values', () => {
      const invalidData = {
        frequency: 'invalid',
        interval: 1,
        nextOccurrenceDate: '2024-05-24',
      };

      const result = createRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Frequency must be one of: daily, weekly, monthly, yearly',
            path: ['frequency'],
          }),
        ])
      );
    });

    it('should reject non-positive interval', () => {
      const invalidData = {
        frequency: 'monthly',
        interval: 0,
        nextOccurrenceDate: '2024-05-24',
      };

      const result = createRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Interval must be a positive integer',
            path: ['interval'],
          }),
        ])
      );
    });

    it('should reject negative interval', () => {
      const invalidData = {
        frequency: 'monthly',
        interval: -1,
        nextOccurrenceDate: '2024-05-24',
      };

      const result = createRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Interval must be a positive integer',
            path: ['interval'],
          }),
        ])
      );
    });

    it('should accept large interval values', () => {
      const validData = {
        frequency: 'yearly',
        interval: 5,
        nextOccurrenceDate: '2024-05-24',
      };

      const result = createRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.interval).toBe(5);
    });
  });

  describe('updateRecurrenceSchema', () => {
    it('should validate valid recurrence update data', () => {
      const validData = {
        frequency: 'daily',
        interval: 3,
        nextOccurrenceDate: '2024-05-25',
        endDate: '2024-12-25',
      };

      const result = updateRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow partial updates', () => {
      const validData = {
        frequency: 'weekly',
      };

      const result = updateRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow null endDate', () => {
      const validData = {
        endDate: null,
      };

      const result = updateRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow empty object for update', () => {
      const result = updateRecurrenceSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject invalid frequency when provided', () => {
      const invalidData = {
        frequency: 'invalid',
      };

      const result = updateRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Frequency must be one of: daily, weekly, monthly, yearly',
            path: ['frequency'],
          }),
        ])
      );
    });

    it('should reject non-positive interval when provided', () => {
      const invalidData = {
        interval: 0,
      };

      const result = updateRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Interval must be a positive integer',
            path: ['interval'],
          }),
        ])
      );
    });
  });

  describe('recurrenceQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        id: 1,
        frequency: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        pageNumber: 2,
        pageSize: 10,
        sortBy: 'frequency',
        sortOrder: 'asc',
      };

      const result = recurrenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should use default pagination values', () => {
      const result = recurrenceQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(1);
      expect(result.data?.pageSize).toBe(25);
    });

    it('should coerce string numbers to numbers for pagination', () => {
      const data = {
        pageNumber: '3',
        pageSize: '15',
      };

      const result = recurrenceQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(3);
      expect(result.data?.pageSize).toBe(15);
    });

    it('should transform empty strings to undefined', () => {
      const data = {
        frequency: '',
        sortBy: '',
        sortOrder: '',
      };

      const result = recurrenceQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.frequency).toBeUndefined();
      expect(result.data?.sortBy).toBeUndefined();
      expect(result.data?.sortOrder).toBeUndefined();
    });

    it('should reject invalid sortBy values', () => {
      const invalidData = {
        sortBy: 'invalid',
      };

      const result = recurrenceQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortBy must be one of: frequency, interval, nextOccurrenceDate, createdAt',
          }),
        ])
      );
    });

    it('should accept valid sortBy values', () => {
      const validSortByValues = ['frequency', 'interval', 'nextOccurrenceDate', 'createdAt'];

      validSortByValues.forEach((sortBy) => {
        const result = recurrenceQuerySchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid sortOrder values', () => {
      const invalidData = {
        sortOrder: 'invalid',
      };

      const result = recurrenceQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortOrder must be one of: asc, desc',
          }),
        ])
      );
    });

    it('should accept valid sortOrder values', () => {
      const validSortOrderValues = ['asc', 'desc'];

      validSortOrderValues.forEach((sortOrder) => {
        const result = recurrenceQuerySchema.safeParse({ sortOrder });
        expect(result.success).toBe(true);
      });
    });

    it('should handle date parameters', () => {
      const validData = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        pageNumber: 1,
        pageSize: 25,
      };

      const result = recurrenceQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });
  });

  describe('deleteRecurrenceSchema', () => {
    it('should validate valid delete recurrence data', () => {
      const validData = {
        id: 1,
      };

      const result = deleteRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject non-positive recurrence ID', () => {
      const invalidData = {
        id: 0,
      };

      const result = deleteRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Recurrence ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject negative recurrence ID', () => {
      const invalidData = {
        id: -1,
      };

      const result = deleteRecurrenceSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Recurrence ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should accept large ID values', () => {
      const validData = {
        id: 999999,
      };

      const result = deleteRecurrenceSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(999999);
    });
  });
});

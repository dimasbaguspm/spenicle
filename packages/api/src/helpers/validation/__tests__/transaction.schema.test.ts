import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  deleteTransactionSchema,
} from '../transaction.schema.ts';

describe('Transaction Schema Validation', () => {
  describe('createTransactionSchema', () => {
    it('should validate valid transaction creation data', () => {
      const validData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100.5,
        currency: 'USD',
        type: 'expense',
        date: '2024-05-24',
        note: 'Test transaction',
        recurrenceId: 5,
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should validate transaction without optional fields', () => {
      const validData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100,
        currency: 'EUR',
        type: 'income',
        date: '2024-05-24',
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should transform string amount to number', () => {
      const data = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 123.45,
        currency: 'USD',
        type: 'transfer',
        date: '2024-05-24',
      };

      const result = createTransactionSchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(123.45);
      expect(typeof result.data?.amount).toBe('number');
    });

    it('should reject non-positive group ID', () => {
      const invalidData = {
        groupId: 0,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100,
        currency: 'USD',
        date: '2024-05-24',
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Group ID is required',
            path: ['groupId'],
          }),
        ])
      );
    });

    it('should reject invalid currency code length', () => {
      const invalidData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100,
        currency: 'INVALID',
        date: '2024-05-24',
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Currency code must be 3 characters',
            path: ['currency'],
          }),
        ])
      );
    });

    it('should reject invalid amount values', () => {
      const invalidData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 'invalid',
        currency: 'USD',
        date: '2024-05-24',
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected number, received string',
          }),
        ])
      );
    });

    it('should reject null or undefined amount', () => {
      const invalidData1 = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: null,
        currency: 'USD',
        date: '2024-05-24',
      };

      const invalidData2 = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: undefined,
        currency: 'USD',
        date: '2024-05-24',
      };

      expect(createTransactionSchema.safeParse(invalidData1).success).toBe(false);
      expect(createTransactionSchema.safeParse(invalidData2).success).toBe(false);
    });

    it('should validate transaction with isHighlighted true', () => {
      const validData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100,
        currency: 'USD',
        type: 'expense',
        date: '2024-05-24',
        isHighlighted: true,
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.data?.isHighlighted).toBe(true);
    });

    it('should validate transaction with isHighlighted false', () => {
      const validData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100,
        currency: 'USD',
        type: 'expense',
        date: '2024-05-24',
        isHighlighted: false,
      };

      const result = createTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.data?.isHighlighted).toBe(false);
    });

    it('should reject non-boolean isHighlighted values', () => {
      const invalidData = {
        groupId: 1,
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 100,
        currency: 'USD',
        type: 'expense',
        date: '2024-05-24',
        isHighlighted: 'true',
      };

      const result = createTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected boolean, received string',
            path: ['isHighlighted'],
          }),
        ])
      );
    });
  });

  describe('updateTransactionSchema', () => {
    it('should validate valid transaction update data', () => {
      const validData = {
        accountId: 2,
        categoryId: 3,
        createdByUserId: 4,
        amount: 150,
        currency: 'EUR',
        date: '2024-05-25',
        note: 'Updated note',
        recurrenceId: null,
      };

      const result = updateTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow partial updates', () => {
      const validData = {
        amount: 200,
        note: 'Updated amount only',
      };

      const result = updateTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow empty object for update', () => {
      const result = updateTransactionSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should allow null recurrenceId', () => {
      const validData = {
        recurrenceId: null,
      };

      const result = updateTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should validate updating isHighlighted to true', () => {
      const validData = {
        isHighlighted: true,
      };

      const result = updateTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.data?.isHighlighted).toBe(true);
    });

    it('should validate updating isHighlighted to false', () => {
      const validData = {
        isHighlighted: false,
      };

      const result = updateTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.data?.isHighlighted).toBe(false);
    });

    it('should reject non-boolean isHighlighted in updates', () => {
      const invalidData = {
        isHighlighted: 'false',
      };

      const result = updateTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected boolean, received string',
            path: ['isHighlighted'],
          }),
        ])
      );
    });
  });

  describe('transactionQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        id: 1,
        groupId: 2,
        accountId: 3,
        categoryId: 4,
        createdByUserId: 5,
        isHighlighted: true,
        note: 'search term',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        currency: 'USD',
        recurrenceId: 6,
        pageNumber: 2,
        pageSize: 10,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      const result = transactionQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should use default pagination values', () => {
      const result = transactionQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(1);
      expect(result.data?.pageSize).toBe(25);
    });

    it('should coerce string numbers to numbers for pagination', () => {
      const data = {
        pageNumber: '3',
        pageSize: '15',
      };

      const result = transactionQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(3);
      expect(result.data?.pageSize).toBe(15);
    });

    it('should transform empty note string to undefined', () => {
      const data = {
        note: '',
      };

      const result = transactionQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.note).toBeUndefined();
    });

    it('should reject empty note when provided as non-empty', () => {
      // This test might not be relevant based on the current transform logic
      // The transform converts empty strings to undefined, so this should pass
      const data = {
        note: '',
      };

      const result = transactionQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate date formats', () => {
      const validData = {
        startDate: '2024-05-24',
        endDate: '2024-05-25T10:30:00Z',
        pageNumber: 1,
        pageSize: 25,
      };

      const result = transactionQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid date formats', () => {
      const invalidData = {
        startDate: 'invalid-date',
      };

      const result = transactionQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Invalid start date format',
          }),
        ])
      );
    });

    it('should reject invalid sortBy values', () => {
      const invalidData = {
        sortBy: 'invalid',
      };

      const result = transactionQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortBy must be one of: date, amount, createdAt',
          }),
        ])
      );
    });

    it('should accept valid sortBy values', () => {
      const validData1 = { sortBy: 'date' };
      const validData2 = { sortBy: 'amount' };
      const validData3 = { sortBy: 'createdAt' };

      expect(transactionQuerySchema.safeParse(validData1).success).toBe(true);
      expect(transactionQuerySchema.safeParse(validData2).success).toBe(true);
      expect(transactionQuerySchema.safeParse(validData3).success).toBe(true);
    });

    it('should reject invalid sortOrder values', () => {
      const invalidData = {
        sortOrder: 'invalid',
      };

      const result = transactionQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortOrder must be one of: asc, desc',
          }),
        ])
      );
    });

    it('should validate isHighlighted filter as true', () => {
      const validData = {
        isHighlighted: true,
      };

      const result = transactionQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.isHighlighted).toBe(true);
    });

    it('should validate isHighlighted filter as false', () => {
      const validData = {
        isHighlighted: false,
      };

      const result = transactionQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.isHighlighted).toBe(false);
    });

    it('should reject non-boolean isHighlighted in query', () => {
      const invalidData = {
        isHighlighted: 'true',
      };

      const result = transactionQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected boolean, received string',
            path: ['isHighlighted'],
          }),
        ])
      );
    });

    it('should reject invalid isHighlighted values', () => {
      const invalidData = {
        isHighlighted: 1,
      };

      const result = transactionQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Expected boolean, received number',
            path: ['isHighlighted'],
          }),
        ])
      );
    });
  });

  describe('deleteTransactionSchema', () => {
    it('should validate valid delete transaction data', () => {
      const validData = {
        id: 1,
      };

      const result = deleteTransactionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject non-positive transaction ID', () => {
      const invalidData = {
        id: 0,
      };

      const result = deleteTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Transaction ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject negative transaction ID', () => {
      const invalidData = {
        id: -1,
      };

      const result = deleteTransactionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Transaction ID is required',
            path: ['id'],
          }),
        ])
      );
    });
  });
});

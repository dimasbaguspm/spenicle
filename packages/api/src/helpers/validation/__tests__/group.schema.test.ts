import { createGroupSchema, updateGroupSchema, groupQuerySchema, deleteGroupSchema } from '../group.schema.ts';

describe('Group Schema Validation', () => {
  describe('createGroupSchema', () => {
    it('should validate valid group creation data', () => {
      const validData = {
        name: 'Test Group',
        defaultCurrency: 'USD',
      };

      const result = createGroupSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject empty group name', () => {
      const invalidData = {
        name: '',
        defaultCurrency: 'USD',
      };

      const result = createGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Group name is required',
            path: ['name'],
          }),
        ])
      );
    });

    it('should reject invalid currency code length', () => {
      const invalidData = {
        name: 'Test Group',
        defaultCurrency: 'INVALID',
      };

      const result = createGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Currency code must be 3 characters',
            path: ['defaultCurrency'],
          }),
        ])
      );
    });

    it('should reject missing group name', () => {
      const invalidData = {
        defaultCurrency: 'USD',
      };

      const result = createGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['name'],
          }),
        ])
      );
    });

    it('should reject group name that is too long', () => {
      const invalidData = {
        name: 'a'.repeat(256), // 256 characters, exceeds 255 limit
        defaultCurrency: 'USD',
      };

      const result = createGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Group name must be at most 255 characters',
            path: ['name'],
          }),
        ])
      );
    });
  });

  describe('updateGroupSchema', () => {
    it('should validate valid group update data', () => {
      const validData = {
        name: 'Updated Group',
        defaultCurrency: 'EUR',
      };

      const result = updateGroupSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow partial updates', () => {
      const validData = {
        name: 'Updated Group Only',
      };

      const result = updateGroupSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow empty object for update', () => {
      const result = updateGroupSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should reject empty name in partial update', () => {
      const invalidData = {
        name: '',
      };

      const result = updateGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Group name is required',
            path: ['name'],
          }),
        ])
      );
    });

    it('should reject invalid currency code in partial update', () => {
      const invalidData = {
        defaultCurrency: 'INVALID',
      };

      const result = updateGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Currency code must be 3 characters',
            path: ['defaultCurrency'],
          }),
        ])
      );
    });
  });

  describe('groupQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        id: 1,
        name: 'Test',
        pageNumber: 2,
        pageSize: 10,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
      };

      const result = groupQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should apply defaults for optional pagination parameters', () => {
      const validData = {
        name: 'Test',
      };

      const result = groupQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(1);
      expect(result.data?.pageSize).toBe(25);
    });

    it('should transform empty string name to undefined', () => {
      const validData = {
        name: '',
      };

      const result = groupQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBeUndefined();
    });

    it('should transform empty string sortBy to undefined', () => {
      const validData = {
        sortBy: '',
      };

      const result = groupQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.sortBy).toBeUndefined();
    });

    it('should reject invalid sortBy values', () => {
      const invalidData = {
        sortBy: 'invalid',
      };

      const result = groupQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortBy must be one of: name, createdAt',
            path: ['sortBy'],
          }),
        ])
      );
    });

    it('should reject invalid sortOrder values', () => {
      const invalidData = {
        sortOrder: 'invalid',
      };

      const result = groupQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'sortOrder must be one of: asc, desc',
            path: ['sortOrder'],
          }),
        ])
      );
    });

    it('should reject non-positive id values', () => {
      const invalidData = {
        id: 0,
      };

      const result = groupQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Number must be greater than 0',
            path: ['id'],
          }),
        ])
      );
    });

    it('should coerce string numbers for pagination', () => {
      const validData = {
        pageNumber: '2',
        pageSize: '10',
      };

      const result = groupQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data?.pageNumber).toBe(2);
      expect(result.data?.pageSize).toBe(10);
    });

    it('should reject pageNumber less than 1', () => {
      const invalidData = {
        pageNumber: 0,
      };

      const result = groupQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Number must be greater than or equal to 1',
            path: ['pageNumber'],
          }),
        ])
      );
    });

    it('should reject pageSize less than 1', () => {
      const invalidData = {
        pageSize: 0,
      };

      const result = groupQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Number must be greater than or equal to 1',
            path: ['pageSize'],
          }),
        ])
      );
    });
  });

  describe('deleteGroupSchema', () => {
    it('should validate valid group deletion data', () => {
      const validData = {
        id: 1,
      };

      const result = deleteGroupSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject non-positive group ID', () => {
      const invalidData = {
        id: 0,
      };

      const result = deleteGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Group ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject negative group ID', () => {
      const invalidData = {
        id: -1,
      };

      const result = deleteGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Group ID is required',
            path: ['id'],
          }),
        ])
      );
    });

    it('should reject missing group ID', () => {
      const invalidData = {};

      const result = deleteGroupSchema.safeParse(invalidData);

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

    it('should reject non-integer group ID', () => {
      const invalidData = {
        id: 1.5,
      };

      const result = deleteGroupSchema.safeParse(invalidData);

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

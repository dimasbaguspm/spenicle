import { createAccountSchema, updateAccountSchema, accountQuerySchema } from '../account.schema.ts';

describe('Account Schema Validation', () => {
  describe('createAccountSchema', () => {
    it('should validate valid account creation data', () => {
      const validData = {
        groupId: 1,
        name: 'Test Account',
        type: 'checking',
        note: 'Test note',
        metadata: null,
      };

      const result = createAccountSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should validate account with null limit', () => {
      const validData = {
        groupId: 1,
        name: 'Test Account',
        type: 'savings',
        metadata: null,
      };

      const result = createAccountSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject empty name', () => {
      const invalidData = {
        groupId: 1,
        name: '',
        type: 'checking',
        limit: 1000,
      };

      const result = createAccountSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Name is required',
            path: ['name'],
          }),
        ])
      );
    });

    it('should reject name longer than 255 characters', () => {
      const invalidData = {
        groupId: 1,
        name: 'a'.repeat(256),
        type: 'checking',
        limit: 1000,
      };

      const result = createAccountSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Name must be at most 255 characters',
            path: ['name'],
          }),
        ])
      );
    });

    it('should reject empty account type', () => {
      const invalidData = {
        groupId: 1,
        name: 'Test Account',
        type: '',
        limit: 1000,
      };

      const result = createAccountSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Account type is required',
            path: ['type'],
          }),
        ])
      );
    });

    it('should reject non-positive group ID', () => {
      const invalidData = {
        groupId: 0,
        name: 'Test Account',
        type: 'checking',
        limit: 1000,
      };

      const result = createAccountSchema.safeParse(invalidData);

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

    describe('metadata field validation', () => {
      it('should accept null metadata', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
          metadata: null,
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toBeNull();
      });

      it('should accept undefined metadata', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
          metadata: undefined,
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toBeUndefined();
      });

      it('should accept empty object metadata', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
          metadata: {},
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual({});
      });

      it('should accept metadata with any object keys and values', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
          metadata: {
            bankCode: 'ABC123',
            accountNumber: '1234567890',
            branch: 'Main Branch',
            settings: {
              enableNotifications: true,
              dailyLimit: 5000,
              currencies: ['USD', 'EUR', 'GBP'],
            },
            customField: 'any value',
            nestedObject: {
              level1: {
                level2: {
                  data: 'deep nested value',
                  array: [1, 2, 3, 'string', { key: 'value' }],
                },
              },
            },
          },
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual(validData.metadata);
      });

      it('should accept metadata with mixed data types', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
          metadata: {
            stringValue: 'text',
            numberValue: 42,
            booleanValue: true,
            arrayValue: [1, 'two', { three: 3 }],
            objectValue: { nested: 'value' },
            nullValue: null,
          },
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual(validData.metadata);
      });

      it('should default to null when metadata is not provided', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toBeUndefined();
      });

      it('should accept metadata with arbitrary property names', () => {
        const validData = {
          groupId: 1,
          name: 'Test Account',
          type: 'checking',
          metadata: {
            'custom-field': 'hyphenated key',
            'special@email': 'special characters',
            '123numeric': 'numeric start',
            unicodeKey: 'unicode characters',
            'very.long.dotted.key.name': 'dotted notation',
          },
        };

        const result = createAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual(validData.metadata);
      });
    });
  });

  describe('updateAccountSchema', () => {
    it('should validate valid account update data', () => {
      const validData = {
        name: 'Updated Account',
        type: 'savings',
        note: 'Updated note',
      };

      const result = updateAccountSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow partial updates', () => {
      const validData = {
        name: 'Updated Name Only',
      };

      const result = updateAccountSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should allow empty object for update', () => {
      const result = updateAccountSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    describe('metadata field validation in updates', () => {
      it('should accept null metadata in updates', () => {
        const validData = {
          name: 'Updated Account',
          metadata: null,
        };

        const result = updateAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toBeNull();
      });

      it('should accept complex metadata updates', () => {
        const validData = {
          metadata: {
            updated: true,
            timestamp: Date.now(),
            changes: ['name', 'type'],
            auditLog: {
              updatedBy: 'user123',
              reason: 'Account restructuring',
            },
          },
        };

        const result = updateAccountSchema.safeParse(validData);

        expect(result.success).toBe(true);
        expect(result.data?.metadata).toEqual(validData.metadata);
      });
    });
  });

  describe('accountQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        id: 1,
        groupId: 2,
        name: 'Test Account',
        type: 'checking',
        pageNumber: 1,
        pageSize: 25,
      };

      const result = accountQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should transform empty strings to undefined', () => {
      const data = {
        name: '',
        type: '',
      };

      const result = accountQuerySchema.safeParse(data);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBeUndefined();
      expect(result.data?.type).toBeUndefined();
    });

    it('should allow empty object', () => {
      const result = accountQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        pageNumber: 1,
        pageSize: 25,
      });
    });
  });
});

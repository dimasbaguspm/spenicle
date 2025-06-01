import {
  createRefreshTokenSchema,
  updateRefreshTokenSchema,
  refreshTokenQuerySchema,
  deleteRefreshTokenSchema,
} from '../refresh-token.schema.ts';

describe('createRefreshTokenSchema', () => {
  it('should validate valid refresh token creation data', () => {
    const validData = {
      userId: 1,
      token: 'abc123def456',
      expires: '2024-12-31T23:59:59.000Z',
    };

    const result = createRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should reject negative userId', () => {
    const invalidData = {
      userId: -1,
      token: 'abc123def456',
      expires: '2024-12-31T23:59:59.000Z',
    };

    const result = createRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('User ID is required');
    }
  });

  it('should reject zero userId', () => {
    const invalidData = {
      userId: 0,
      token: 'abc123def456',
      expires: '2024-12-31T23:59:59.000Z',
    };

    const result = createRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('User ID is required');
    }
  });

  it('should reject non-integer userId', () => {
    const invalidData = {
      userId: 1.5,
      token: 'abc123def456',
      expires: '2024-12-31T23:59:59.000Z',
    };

    const result = createRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty token', () => {
    const invalidData = {
      userId: 1,
      token: '',
      expires: '2024-12-31T23:59:59.000Z',
    };

    const result = createRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Token is required');
    }
  });

  it('should reject missing token', () => {
    const invalidData = {
      userId: 1,
      expires: '2024-12-31T23:59:59.000Z',
    };

    const result = createRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept any string format for expires', () => {
    const validData = {
      userId: 1,
      token: 'abc123def456',
      expires: '2024-12-31',
    };

    const result = createRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const invalidData = {};

    const result = createRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(3);
    }
  });
});

describe('updateRefreshTokenSchema', () => {
  it('should validate valid update data with all fields', () => {
    const validData = {
      revokedAt: '2024-12-31T23:59:59.000Z',
      replacedByToken: 'new-token-123',
    };

    const result = updateRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should validate with only revokedAt', () => {
    const validData = {
      revokedAt: '2024-12-31T23:59:59.000Z',
    };

    const result = updateRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should validate with only replacedByToken', () => {
    const validData = {
      replacedByToken: 'new-token-123',
    };

    const result = updateRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should validate empty object (all fields optional)', () => {
    const validData = {};

    const result = updateRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it('should reject non-string revokedAt', () => {
    const invalidData = {
      revokedAt: 123,
    };

    const result = updateRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject non-string replacedByToken', () => {
    const invalidData = {
      replacedByToken: 123,
    };

    const result = updateRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('refreshTokenQuerySchema', () => {
  it('should validate valid query parameters', () => {
    const validData = {
      userId: 1,
      token: 'abc123def456',
      isActive: true,
      pageNumber: 2,
      pageSize: 50,
      sortBy: 'userId',
      sortOrder: 'desc',
    };

    const result = refreshTokenQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should apply default values for pagination', () => {
    const inputData = {};

    const result = refreshTokenQuerySchema.safeParse(inputData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageNumber).toBe(1);
      expect(result.data.pageSize).toBe(25);
    }
  });

  it('should coerce string numbers to numbers for pagination', () => {
    const inputData = {
      pageNumber: '3',
      pageSize: '15',
    };

    const result = refreshTokenQuerySchema.safeParse(inputData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageNumber).toBe(3);
      expect(result.data.pageSize).toBe(15);
    }
  });

  it('should reject negative pageNumber', () => {
    const invalidData = {
      pageNumber: 0,
    };

    const result = refreshTokenQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject negative pageSize', () => {
    const invalidData = {
      pageSize: 0,
    };

    const result = refreshTokenQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid sortBy values', () => {
    const invalidData = {
      sortBy: 'invalidField',
    };

    const result = refreshTokenQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('sortBy must be one of: userId, expires, createdAt');
    }
  });

  it('should accept valid sortBy values', () => {
    const validSortBy = ['userId', 'expires', 'createdAt'];

    for (const sortBy of validSortBy) {
      const data = { sortBy };
      const result = refreshTokenQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe(sortBy);
      }
    }
  });

  it('should reject invalid sortOrder values', () => {
    const invalidData = {
      sortOrder: 'invalid',
    };

    const result = refreshTokenQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('sortOrder must be one of: asc, desc');
    }
  });

  it('should accept valid sortOrder values', () => {
    const validSortOrders = ['asc', 'desc'];

    for (const sortOrder of validSortOrders) {
      const data = { sortOrder };
      const result = refreshTokenQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe(sortOrder);
      }
    }
  });

  it('should transform empty strings to undefined for sortBy and sortOrder', () => {
    const inputData = {
      sortBy: '',
      sortOrder: '',
    };

    const result = refreshTokenQuerySchema.safeParse(inputData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBeUndefined();
      expect(result.data.sortOrder).toBeUndefined();
    }
  });

  it('should reject negative userId', () => {
    const invalidData = {
      userId: -1,
    };

    const result = refreshTokenQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer userId', () => {
    const invalidData = {
      userId: 1.5,
    };

    const result = refreshTokenQuerySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept boolean isActive', () => {
    const validData = {
      isActive: false,
    };

    const result = refreshTokenQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });
});

describe('deleteRefreshTokenSchema', () => {
  it('should validate valid delete data', () => {
    const validData = {
      id: 123,
    };

    const result = deleteRefreshTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should reject negative id', () => {
    const invalidData = {
      id: -1,
    };

    const result = deleteRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Refresh Token ID is required');
    }
  });

  it('should reject zero id', () => {
    const invalidData = {
      id: 0,
    };

    const result = deleteRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Refresh Token ID is required');
    }
  });

  it('should reject non-integer id', () => {
    const invalidData = {
      id: 1.5,
    };

    const result = deleteRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const invalidData = {};

    const result = deleteRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject non-numeric id', () => {
    const invalidData = {
      id: 'abc',
    };

    const result = deleteRefreshTokenSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

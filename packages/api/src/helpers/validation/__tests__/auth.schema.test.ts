import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  registerWithGroupSchema,
} from '../auth.schema.ts';

describe('Auth Schema Validation', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
        groupId: 1,
      };

      const result = registerSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'John Doe',
        groupId: 1,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Invalid email format',
            path: ['email'],
          }),
        ])
      );
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        name: 'John Doe',
        groupId: 1,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Password must be at least 8 characters',
            path: ['password'],
          }),
        ])
      );
    });

    it('should reject empty name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: '',
        groupId: 1,
      };

      const result = registerSchema.safeParse(invalidData);

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

    it('should reject non-positive group ID', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
        groupId: 0,
      };

      const result = registerSchema.safeParse(invalidData);

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

    it('should reject email that is too long', () => {
      const invalidData = {
        email: 'a'.repeat(250) + '@example.com', // Over 255 characters
        password: 'password123',
        name: 'John Doe',
        groupId: 1,
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Email must be at most 255 characters',
            path: ['email'],
          }),
        ])
      );
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'a'.repeat(256), // Over 255 characters
        groupId: 1,
      };

      const result = registerSchema.safeParse(invalidData);

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
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Invalid email format',
            path: ['email'],
          }),
        ])
      );
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Password is required',
            path: ['password'],
          }),
        ])
      );
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['email'],
          }),
        ])
      );
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = loginSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['password'],
          }),
        ])
      );
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'valid-refresh-token',
      };

      const result = refreshTokenSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject empty refresh token', () => {
      const invalidData = {
        refreshToken: '',
      };

      const result = refreshTokenSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Refresh token is required',
            path: ['refreshToken'],
          }),
        ])
      );
    });

    it('should reject missing refresh token', () => {
      const invalidData = {};

      const result = refreshTokenSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['refreshToken'],
          }),
        ])
      );
    });
  });

  describe('logoutSchema', () => {
    it('should validate valid logout data', () => {
      const validData = {
        refreshToken: 'valid-refresh-token',
      };

      const result = logoutSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject empty refresh token', () => {
      const invalidData = {
        refreshToken: '',
      };

      const result = logoutSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Refresh token is required',
            path: ['refreshToken'],
          }),
        ])
      );
    });

    it('should reject missing refresh token', () => {
      const invalidData = {};

      const result = logoutSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['refreshToken'],
          }),
        ])
      );
    });
  });

  describe('registerWithGroupSchema', () => {
    it('should validate valid registration with group data', () => {
      const validData = {
        user: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John Doe',
        },
        group: {
          name: 'Test Group',
          defaultCurrency: 'USD',
        },
      };

      const result = registerWithGroupSchema.safeParse(validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject if user data is invalid', () => {
      const invalidData = {
        user: {
          email: 'invalid-email',
          password: '123',
          name: '',
        },
        group: {
          name: 'Test Group',
          defaultCurrency: 'USD',
        },
      };

      const result = registerWithGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors.length).toBeGreaterThan(0);
    });

    it('should reject if group data is invalid', () => {
      const invalidData = {
        user: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John Doe',
        },
        group: {
          name: '',
          defaultCurrency: 'INVALID',
        },
      };

      const result = registerWithGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors.length).toBeGreaterThan(0);
    });

    it('should reject missing user object', () => {
      const invalidData = {
        group: {
          name: 'Test Group',
          defaultCurrency: 'USD',
        },
      };

      const result = registerWithGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['user'],
          }),
        ])
      );
    });

    it('should reject missing group object', () => {
      const invalidData = {
        user: {
          email: 'test@example.com',
          password: 'password123',
          name: 'John Doe',
        },
      };

      const result = registerWithGroupSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Required',
            path: ['group'],
          }),
        ])
      );
    });
  });
});

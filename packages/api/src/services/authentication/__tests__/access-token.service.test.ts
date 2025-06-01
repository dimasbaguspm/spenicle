import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { Mock, vi } from 'vitest';

import { UnauthorizedException } from '../../../helpers/exceptions/index.ts';
import { AccessTokenService } from '../access-token.service.ts';

// Mock jsonwebtoken module
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    sign: vi.fn(),
  },
}));

// Get the mocked functions with proper typing
const mockVerify = jwt.verify as Mock;
const mockSign = jwt.sign as Mock;

describe('AccessTokenService', () => {
  let accessTokenService: AccessTokenService;
  const mockJwtSecret = 'test-secret-key';

  beforeEach(() => {
    // Set up environment
    process.env.API_JWT_SECRET = mockJwtSecret;
    accessTokenService = new AccessTokenService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.API_JWT_SECRET;
  });

  describe('constructor', () => {
    it('should use JWT_SECRET from environment', () => {
      process.env.API_JWT_SECRET = 'custom-secret';
      const service = new AccessTokenService();
      expect(service).toBeDefined();
    });

    it('should use default secret when JWT_SECRET is not set', () => {
      delete process.env.API_JWT_SECRET;
      const service = new AccessTokenService();
      expect(service).toBeDefined();
    });
  });

  describe('extractTokenFromRequest', () => {
    it('should extract token from valid authorization header', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      } as Request;

      const result = accessTokenService.extractTokenFromRequest(mockRequest);
      expect(result).toBe('valid-token-123');
    });

    it('should throw UnauthorizedException when authorization header is missing', () => {
      const mockRequest = {
        headers: {},
      } as Request;

      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow(UnauthorizedException);
      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow('Authorization header is missing');
    });

    it('should throw UnauthorizedException when authorization format is invalid', () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      } as Request;

      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow(UnauthorizedException);
      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow('Invalid authorization format');
    });

    it('should throw UnauthorizedException when token is missing', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer ',
        },
      } as Request;

      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow(UnauthorizedException);
      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow('Token is missing');
    });

    it('should throw UnauthorizedException when authorization header has wrong number of parts', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer',
        },
      } as Request;

      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow(UnauthorizedException);
      expect(() => accessTokenService.extractTokenFromRequest(mockRequest)).toThrow('Invalid authorization format');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token and return payload', () => {
      const mockPayload = {
        sub: '123',
        email: 'test@example.com',
        groupId: 1,
        name: 'Test User',
        isActive: true,
      };

      mockVerify.mockReturnValue(mockPayload);

      const result = accessTokenService.verifyAccessToken('valid-token');
      expect(result).toEqual(mockPayload);
      expect(mockVerify).toHaveBeenCalledWith('valid-token', mockJwtSecret);
    });

    it('should throw error when token is invalid', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => accessTokenService.verifyAccessToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw error when decoded payload is invalid', () => {
      mockVerify.mockReturnValue(null);

      expect(() => accessTokenService.verifyAccessToken('invalid-token')).toThrow('Invalid token payload');
    });

    it('should throw error when decoded payload is not an object', () => {
      mockVerify.mockReturnValue('string-payload');

      expect(() => accessTokenService.verifyAccessToken('invalid-token')).toThrow('Invalid token payload');
    });

    it('should throw error when decoded payload has no sub', () => {
      const mockPayload = {
        email: 'test@example.com',
        // missing sub
      };

      mockVerify.mockReturnValue(mockPayload);

      expect(() => accessTokenService.verifyAccessToken('invalid-token')).toThrow('Invalid token payload');
    });
  });

  describe('getUserFromToken', () => {
    it('should extract user data from valid token', () => {
      const mockPayload = {
        sub: 123,
        email: 'test@example.com',
        groupId: 1,
        name: 'Test User',
        isActive: true,
      };

      mockVerify.mockReturnValue(mockPayload);

      const result = accessTokenService.getUserFromToken('valid-token');
      expect(result).toEqual({
        id: 123,
        email: 'test@example.com',
        groupId: 1,
        name: 'Test User',
        isActive: true,
        sub: 123,
      });
    });

    it('should convert string sub to number for id', () => {
      const mockPayload = {
        sub: '456',
        email: 'test@example.com',
        groupId: 2,
        name: 'Test User 2',
        isActive: false,
      };

      mockVerify.mockReturnValue(mockPayload);

      const result = accessTokenService.getUserFromToken('valid-token');
      expect(result).toEqual({
        id: 456,
        email: 'test@example.com',
        groupId: 2,
        name: 'Test User 2',
        isActive: false,
        sub: '456',
      });
    });

    it('should throw error when token verification fails', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      expect(() => accessTokenService.getUserFromToken('expired-token')).toThrow(
        'Failed to extract user data from token'
      );
    });
  });

  describe('getUserFromRequest', () => {
    it('should extract user from valid request', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      } as Request;

      const mockPayload = {
        sub: 789,
        email: 'user@example.com',
        groupId: 3,
        name: 'Request User',
        isActive: true,
      };

      mockVerify.mockReturnValue(mockPayload);

      const result = accessTokenService.getUserFromRequest(mockRequest);
      expect(result).toEqual({
        id: 789,
        email: 'user@example.com',
        groupId: 3,
        name: 'Request User',
        isActive: true,
        sub: 789,
      });
    });

    it('should throw error when authorization header is missing', () => {
      const mockRequest = {
        headers: {},
      } as Request;

      expect(() => accessTokenService.getUserFromRequest(mockRequest)).toThrow(UnauthorizedException);
    });
  });

  describe('tryGetUserFromRequest', () => {
    it('should return user data from valid request', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      } as Request;

      const mockPayload = {
        sub: 999,
        email: 'tryuser@example.com',
        groupId: 4,
        name: 'Try User',
        isActive: true,
      };

      mockVerify.mockReturnValue(mockPayload);

      const result = accessTokenService.tryGetUserFromRequest(mockRequest);
      expect(result).toEqual({
        id: 999,
        email: 'tryuser@example.com',
        groupId: 4,
        name: 'Try User',
        isActive: true,
        sub: 999,
      });
    });

    it('should return null when authorization header is missing', () => {
      const mockRequest = {
        headers: {},
      } as Request;

      const result = accessTokenService.tryGetUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });

    it('should return null when token is invalid', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as Request;

      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = accessTokenService.tryGetUserFromRequest(mockRequest);
      expect(result).toBeNull();
    });
  });

  describe('generateAccessToken', () => {
    it('should generate token with user data', () => {
      const user = {
        id: 123,
        email: 'test@example.com',
        groupId: 1,
      };

      const expectedPayload = {
        sub: 123,
        email: 'test@example.com',
        userId: 123,
        groupId: 1,
      };

      mockSign.mockReturnValue('generated-token');

      const result = accessTokenService.generateAccessToken(user);

      expect(result).toBe('generated-token');
      expect(mockSign).toHaveBeenCalledWith(expectedPayload, mockJwtSecret, { expiresIn: '24h' });
    });

    it('should generate token without groupId when not provided', () => {
      const user = {
        id: 456,
        email: 'nogroup@example.com',
      };

      const expectedPayload = {
        sub: 456,
        email: 'nogroup@example.com',
        userId: 456,
        groupId: undefined,
      };

      mockSign.mockReturnValue('generated-token-no-group');

      const result = accessTokenService.generateAccessToken(user);

      expect(result).toBe('generated-token-no-group');
      expect(mockSign).toHaveBeenCalledWith(expectedPayload, mockJwtSecret, { expiresIn: '24h' });
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode token successfully', () => {
      const mockDecoded = {
        sub: 123,
        email: 'verify@example.com',
        userId: 123,
        groupId: 5,
      };

      mockVerify.mockReturnValue(mockDecoded);

      const result = accessTokenService.verifyToken('valid-token');

      expect(result).toEqual({
        sub: 123,
        email: 'verify@example.com',
        userId: 123,
        groupId: 5,
      });
      expect(mockVerify).toHaveBeenCalledWith('valid-token', mockJwtSecret);
    });

    it('should handle token with userId fallback to sub', () => {
      const mockDecoded = {
        sub: 789,
        email: 'fallback@example.com',
        // no userId, should fallback to sub
        groupId: 6,
      };

      mockVerify.mockReturnValue(mockDecoded);

      const result = accessTokenService.verifyToken('valid-token');

      expect(result).toEqual({
        sub: 789,
        email: 'fallback@example.com',
        userId: 789,
        groupId: 6,
      });
    });

    it('should handle token without groupId', () => {
      const mockDecoded = {
        sub: 111,
        email: 'nogroup@example.com',
        userId: 111,
        // no groupId
      };

      mockVerify.mockReturnValue(mockDecoded);

      const result = accessTokenService.verifyToken('valid-token');

      expect(result).toEqual({
        sub: 111,
        email: 'nogroup@example.com',
        userId: 111,
        groupId: undefined,
      });
    });

    it('should return null when token verification fails', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = accessTokenService.verifyToken('expired-token');
      expect(result).toBeNull();
    });

    it('should return null when decoded is not an object', () => {
      mockVerify.mockReturnValue('string-decoded');

      const result = accessTokenService.verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null when decoded is null', () => {
      mockVerify.mockReturnValue(null);

      const result = accessTokenService.verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});

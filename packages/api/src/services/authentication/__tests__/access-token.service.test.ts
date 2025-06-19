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

      expect(() => accessTokenService.getUserFromToken('expired-token')).toThrow('Failed to verify token');
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
});

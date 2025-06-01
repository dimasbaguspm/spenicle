import crypto from 'crypto';

import { eq, and, isNull } from 'drizzle-orm';
import { Mock, Mocked, MockInstance, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { refreshTokens, RefreshToken } from '../../../models/schema.ts';
import { RefreshTokenService } from '../refresh-token.service.ts';

// Mock crypto module
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(),
  },
}));

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  gt: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

// Mock database configuration
vi.mock('../../../core/db/config.ts', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Get the mocked functions with proper typing
const mockRandomBytes = crypto.randomBytes as Mock;
const mockEq = eq as Mock;
const mockAnd = and as Mock;
const mockIsNull = isNull as Mock;
const mockDb = db as Mocked<typeof db>;

describe('RefreshTokenService', () => {
  let refreshTokenService: RefreshTokenService;
  let mockDate: MockInstance;

  const mockRefreshToken: RefreshToken = {
    id: 1,
    userId: 123,
    token: 'mock-token-123',
    expires: '2024-12-31T23:59:59.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    revokedAt: null,
    replacedByToken: null,
  };

  beforeEach(() => {
    refreshTokenService = new RefreshTokenService();
    mockDate = vi.spyOn(Date.prototype, 'toISOString');
    mockDate.mockReturnValue('2024-06-01T12:00:00.000Z');
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with default expiry', async () => {
      const userId = 123;
      const mockToken = 'generated-token-123';

      mockRandomBytes.mockReturnValue({
        toString: vi.fn().mockReturnValue(mockToken),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await refreshTokenService.generateRefreshToken(userId);

      expect(result).toBe(mockToken);
      expect(mockRandomBytes).toHaveBeenCalledWith(40);
      expect(mockDb.insert).toHaveBeenCalledWith(refreshTokens);
      expect(mockInsert().values).toHaveBeenCalledWith({
        userId,
        token: mockToken,
        expires: expect.any(String),
      });
    });

    it('should generate refresh token with custom expiry', async () => {
      const userId = 456;
      const expiresDays = 14;
      const mockToken = 'custom-token-456';

      mockRandomBytes.mockReturnValue({
        toString: vi.fn().mockReturnValue(mockToken),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await refreshTokenService.generateRefreshToken(userId, expiresDays);

      expect(result).toBe(mockToken);
      expect(mockRandomBytes).toHaveBeenCalledWith(40);
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token when found', async () => {
      const token = 'existing-token';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRefreshToken]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.getRefreshToken(token);

      expect(result).toEqual(mockRefreshToken);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(refreshTokens.token, token);
    });

    it('should return undefined when token not found', async () => {
      const token = 'non-existing-token';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.getRefreshToken(token);

      expect(result).toBeUndefined();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return token when valid and active', async () => {
      const token = 'valid-token';
      const validToken = { ...mockRefreshToken };

      const getSpy = vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(validToken);

      // Use vi.useFakeTimers to control Date
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-01T00:00:00.000Z'));

      const result = await refreshTokenService.validateRefreshToken(token);

      expect(result).toEqual(validToken);
      expect(getSpy).toHaveBeenCalledWith(token);

      // Restore real timers
      vi.useRealTimers();
    });

    it('should return null when token not found', async () => {
      const token = 'non-existing-token';

      vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(undefined);

      const result = await refreshTokenService.validateRefreshToken(token);

      expect(result).toBeNull();
    });

    it('should return null when token is revoked', async () => {
      const token = 'revoked-token';
      const revokedToken = {
        ...mockRefreshToken,
        revokedAt: '2024-05-01T00:00:00.000Z',
      };

      vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(revokedToken);

      const result = await refreshTokenService.validateRefreshToken(token);

      expect(result).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const token = 'expired-token';
      const expiredToken = {
        ...mockRefreshToken,
        expires: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(expiredToken);

      // Use vi.useFakeTimers to control Date
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-01T00:00:00.000Z'));

      const result = await refreshTokenService.validateRefreshToken(token);

      expect(result).toBeNull();

      // Restore real timers
      vi.useRealTimers();
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate valid token successfully', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      const validToken = { ...mockRefreshToken };

      const validateSpy = vi.spyOn(refreshTokenService, 'validateRefreshToken').mockResolvedValue(validToken);
      const generateSpy = vi.spyOn(refreshTokenService, 'generateRefreshToken').mockResolvedValue(newToken);
      const revokeSpy = vi.spyOn(refreshTokenService, 'revokeRefreshToken').mockResolvedValue(true);

      const result = await refreshTokenService.rotateRefreshToken(oldToken);

      expect(result).toBe(newToken);
      expect(validateSpy).toHaveBeenCalledWith(oldToken);
      expect(generateSpy).toHaveBeenCalledWith(validToken.userId);
      expect(revokeSpy).toHaveBeenCalledWith(oldToken, newToken);
    });

    it('should return null when old token is invalid', async () => {
      const oldToken = 'invalid-token';

      vi.spyOn(refreshTokenService, 'validateRefreshToken').mockResolvedValue(null);
      const generateSpy = vi.spyOn(refreshTokenService, 'generateRefreshToken');
      const revokeSpy = vi.spyOn(refreshTokenService, 'revokeRefreshToken');

      const result = await refreshTokenService.rotateRefreshToken(oldToken);

      expect(result).toBeNull();
      expect(generateSpy).not.toHaveBeenCalled();
      expect(revokeSpy).not.toHaveBeenCalled();
    });
  });

  describe('isRefreshTokenActive', () => {
    it('should return true when token is active', async () => {
      const token = 'active-token';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRefreshToken]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.isRefreshTokenActive(token);

      expect(result).toBe(true);
      expect(mockAnd).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(refreshTokens.token, token);
      expect(mockIsNull).toHaveBeenCalledWith(refreshTokens.revokedAt);
    });

    it('should return false when token is not found', async () => {
      const token = 'non-existing-token';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.isRefreshTokenActive(token);

      expect(result).toBe(false);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke token successfully', async () => {
      const token = 'token-to-revoke';
      const replacedByToken = 'replacement-token';

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await refreshTokenService.revokeRefreshToken(token, replacedByToken);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(refreshTokens);
      expect(mockUpdate().set).toHaveBeenCalledWith({
        revokedAt: '2024-06-01T12:00:00.000Z',
        replacedByToken,
      });
      expect(mockEq).toHaveBeenCalledWith(refreshTokens.token, token);
    });

    it('should revoke token without replacement', async () => {
      const token = 'token-to-revoke';

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await refreshTokenService.revokeRefreshToken(token);

      expect(result).toBe(true);
      expect(mockUpdate().set).toHaveBeenCalledWith({
        revokedAt: '2024-06-01T12:00:00.000Z',
        replacedByToken: undefined,
      });
    });

    it('should return false when revocation fails', async () => {
      const token = 'failing-token';

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await refreshTokenService.revokeRefreshToken(token);

      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserRefreshTokens', () => {
    it('should revoke all user tokens', async () => {
      const userId = 123;

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      await refreshTokenService.revokeAllUserRefreshTokens(userId);

      expect(mockDb.update).toHaveBeenCalledWith(refreshTokens);
      expect(mockUpdate().set).toHaveBeenCalledWith({
        revokedAt: '2024-06-01T12:00:00.000Z',
      });
      expect(mockAnd).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(refreshTokens.userId, userId);
      expect(mockIsNull).toHaveBeenCalledWith(refreshTokens.revokedAt);
    });
  });

  describe('verifyRefreshTokenBelongsToUser', () => {
    it('should return true when token belongs to user', async () => {
      const token = 'user-token';
      const userId = 123;
      const userToken = { ...mockRefreshToken, userId };

      vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(userToken);

      const result = await refreshTokenService.verifyRefreshTokenBelongsToUser(token, userId);

      expect(result).toBe(true);
    });

    it('should return false when token does not belong to user', async () => {
      const token = 'other-user-token';
      const userId = 123;
      const otherUserToken = { ...mockRefreshToken, userId: 456 };

      vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(otherUserToken);

      const result = await refreshTokenService.verifyRefreshTokenBelongsToUser(token, userId);

      expect(result).toBe(false);
    });

    it('should return false when token not found', async () => {
      const token = 'non-existing-token';
      const userId = 123;

      vi.spyOn(refreshTokenService, 'getRefreshToken').mockResolvedValue(undefined);

      const result = await refreshTokenService.verifyRefreshTokenBelongsToUser(token, userId);

      expect(result).toBe(false);
    });
  });

  describe('getActiveRefreshTokensForUser', () => {
    it('should return active tokens for user', async () => {
      const userId = 123;
      const activeTokens = [mockRefreshToken];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(activeTokens),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.getActiveRefreshTokensForUser(userId);

      expect(result).toEqual(activeTokens);
      expect(mockAnd).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(refreshTokens.userId, userId);
      expect(mockIsNull).toHaveBeenCalledWith(refreshTokens.revokedAt);
    });
  });

  describe('getReplacedTokens', () => {
    it('should return replaced tokens for user', async () => {
      const userId = 123;
      const allTokens = [
        { ...mockRefreshToken, replacedByToken: 'new-token' },
        { ...mockRefreshToken, id: 2, replacedByToken: null },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(allTokens),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.getReplacedTokens(userId);

      expect(result).toHaveLength(1);
      expect(result[0].replacedByToken).toBe('new-token');
      expect(mockEq).toHaveBeenCalledWith(refreshTokens.userId, userId);
    });
  });

  describe('checkTokenSecurity', () => {
    it('should return security information for user', async () => {
      const userId = 123;
      const activeTokens = [
        { ...mockRefreshToken, createdAt: '2024-05-01T00:00:00.000Z' },
        { ...mockRefreshToken, id: 2, createdAt: '2024-04-01T00:00:00.000Z' },
      ];
      // Create a recently revoked token (within the last day from 2024-06-01)
      const allTokens = [
        ...activeTokens,
        {
          ...mockRefreshToken,
          id: 3,
          revokedAt: '2024-05-31T12:00:00.000Z', // Recently revoked (within last day)
        },
      ];

      vi.spyOn(refreshTokenService, 'getActiveRefreshTokensForUser').mockResolvedValue(activeTokens);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(allTokens),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      // Set the current time to 2024-06-01 for the "one day ago" calculation
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-01T00:00:00.000Z'));

      const result = await refreshTokenService.checkTokenSecurity(userId);

      expect(result.multipleActiveSessions).toBe(true);
      expect(result.recentlyRevokedTokens).toBe(1);
      expect(result.oldestActiveToken).toEqual(activeTokens[1]); // The one with earlier createdAt

      vi.useRealTimers();
    });

    it('should handle single active session', async () => {
      const userId = 123;
      const activeTokens = [mockRefreshToken];
      const allTokens = [mockRefreshToken];

      vi.spyOn(refreshTokenService, 'getActiveRefreshTokensForUser').mockResolvedValue(activeTokens);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(allTokens),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.checkTokenSecurity(userId);

      expect(result.multipleActiveSessions).toBe(false);
      expect(result.oldestActiveToken).toEqual(mockRefreshToken);
    });

    it('should handle no active sessions', async () => {
      const userId = 123;
      const activeTokens: RefreshToken[] = [];
      const allTokens: RefreshToken[] = [];

      vi.spyOn(refreshTokenService, 'getActiveRefreshTokensForUser').mockResolvedValue(activeTokens);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(allTokens),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await refreshTokenService.checkTokenSecurity(userId);

      expect(result.multipleActiveSessions).toBe(false);
      expect(result.oldestActiveToken).toBeNull();
      expect(result.recentlyRevokedTokens).toBe(0);
    });
  });
});

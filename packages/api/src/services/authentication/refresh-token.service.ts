import crypto from 'crypto';

import { eq, gt, and, isNull } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { refreshTokens, NewRefreshToken, RefreshToken } from '../../models/schema.ts';

export class RefreshTokenService {
  /**
   * Generate a new refresh token
   */
  async generateRefreshToken(userId: number, expiresDays = 7): Promise<string> {
    const expires = new Date();
    expires.setDate(expires.getDate() + expiresDays);
    const token = crypto.randomBytes(40).toString('hex');
    const newToken: NewRefreshToken = {
      userId,
      token,
      expires: expires.toISOString(),
    };
    await db.insert(refreshTokens).values(newToken);
    return token;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return refreshToken;
  }

  async validateRefreshToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await this.getRefreshToken(token);
    if (!refreshToken || refreshToken.revokedAt || new Date(refreshToken.expires) < new Date()) {
      return null;
    }
    return refreshToken;
  }

  async rotateRefreshToken(oldToken: string): Promise<string | null> {
    const refreshToken = await this.validateRefreshToken(oldToken);
    if (!refreshToken) {
      return null;
    }
    const newToken = await this.generateRefreshToken(refreshToken.userId);
    await this.revokeRefreshToken(oldToken, newToken);
    return newToken;
  }

  async isRefreshTokenActive(token: string): Promise<boolean> {
    const [refreshToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          gt(refreshTokens.expires, new Date().toISOString()),
          isNull(refreshTokens.revokedAt)
        )
      );
    return !!refreshToken;
  }

  async revokeRefreshToken(token: string, replacedByToken?: string): Promise<boolean> {
    try {
      await db
        .update(refreshTokens)
        .set({
          revokedAt: new Date().toISOString(),
          replacedByToken: replacedByToken,
        })
        .where(eq(refreshTokens.token, token));
      return true;
    } catch {
      return false;
    }
  }

  async revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date().toISOString(),
      })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async verifyRefreshTokenBelongsToUser(token: string, userId: number): Promise<boolean> {
    const refreshToken = await this.getRefreshToken(token);
    if (!refreshToken) {
      return false;
    }
    return refreshToken.userId === userId;
  }

  async getActiveRefreshTokensForUser(userId: number): Promise<RefreshToken[]> {
    return db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          gt(refreshTokens.expires, new Date().toISOString()),
          isNull(refreshTokens.revokedAt)
        )
      );
  }

  async getReplacedTokens(userId: number): Promise<RefreshToken[]> {
    const tokens = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, userId));
    return tokens.filter((token) => token.replacedByToken !== null);
  }

  async checkTokenSecurity(userId: number): Promise<{
    multipleActiveSessions: boolean;
    recentlyRevokedTokens: number;
    oldestActiveToken: RefreshToken | null;
  }> {
    const activeTokens = await this.getActiveRefreshTokensForUser(userId);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const allTokens = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, userId));
    const recentlyRevokedTokens = allTokens.filter(
      (token) => token.revokedAt && new Date(token.revokedAt) > oneDayAgo
    ).length;
    let oldestActiveToken: RefreshToken | null = null;
    if (activeTokens.length > 0) {
      oldestActiveToken = activeTokens.reduce(
        (oldest, current) => (new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest),
        activeTokens[0]
      );
    }
    return {
      multipleActiveSessions: activeTokens.length > 1,
      recentlyRevokedTokens,
      oldestActiveToken,
    };
  }
}

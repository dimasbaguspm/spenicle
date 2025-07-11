import { Request } from 'express';
import jwt from 'jsonwebtoken';

import { UnauthorizedException } from '../../helpers/exceptions/index.ts';
import { User } from '../../models/schema.ts';

type JwtPayload = Pick<User, 'id' | 'groupId' | 'email' | 'name' | 'isActive'> & {
  sub: string | number;
};

export class AccessTokenService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.API_JWT_SECRET ?? 'your_super_secret_key_change_in_production';
  }

  extractTokenFromRequest(req: Request): string {
    const authHeader = req.headers.authorization;

    if (!authHeader) throw new UnauthorizedException('Authorization header is missing');

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization format');
    }

    if (!tokenParts[1]) throw new UnauthorizedException('Token is missing');

    return tokenParts[1];
  }

  // core verification method - handles both throwing and non-throwing scenarios
  private verifyTokenInternal(token: string, shouldThrow = true): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
        if (shouldThrow) throw new Error('Invalid token payload');
        return null;
      }

      return {
        id: Number(decoded.sub),
        email: decoded.email as string,
        groupId: decoded.groupId ? Number(decoded.groupId) : undefined,
        name: decoded.name as string,
        isActive: decoded.isActive as boolean,
        sub: decoded.sub,
      } as JwtPayload;
    } catch {
      if (shouldThrow) throw new Error('Failed to verify token');
      return null;
    }
  }

  getUserFromToken(token: string): JwtPayload {
    try {
      return this.verifyTokenInternal(token, true)!;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  getUserFromRequest(req: Request): JwtPayload {
    const token = this.extractTokenFromRequest(req);
    return this.getUserFromToken(token);
  }

  generateAccessToken(user: { id: number; email: string; groupId?: number }): string {
    const payload = {
      sub: user.id,
      email: user.email,
      userId: user.id,
      groupId: user.groupId,
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }
}

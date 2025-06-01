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

  verifyAccessToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
    if (!decoded || typeof decoded !== 'object' || !decoded.sub) {
      throw new Error('Invalid token payload');
    }
    return decoded;
  }

  getUserFromToken(token: string): JwtPayload {
    try {
      const decoded = this.verifyAccessToken(token);
      return {
        id: Number(decoded.sub),
        email: decoded.email,
        groupId: decoded.groupId,
        name: decoded.name,
        isActive: decoded.isActive,
        sub: decoded.sub,
      } satisfies JwtPayload;
    } catch {
      throw new Error('Failed to extract user data from token');
    }
  }

  getUserFromRequest(req: Request): JwtPayload {
    const token = this.extractTokenFromRequest(req);
    return this.getUserFromToken(token);
  }

  tryGetUserFromRequest(req: Request): JwtPayload | null {
    try {
      const token = this.extractTokenFromRequest(req);
      return this.getUserFromToken(token);
    } catch {
      return null;
    }
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

  verifyToken(token: string): { sub: number; email: string; userId: number; groupId?: number } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (typeof decoded === 'object' && decoded !== null) {
        return {
          sub: Number(decoded?.sub),
          email: decoded?.email as string,
          userId: Number(decoded?.userId ?? decoded?.sub),
          groupId: decoded?.groupId ? Number(decoded?.groupId) : undefined,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

import { Request, Response, NextFunction } from 'express';

import { getErrorResponse } from '../helpers/http-response/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';

const accessTokenService = new AccessTokenService();

/**
 * Middleware to authenticate JWT tokens - only validates token existence and validity
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract and verify token - this will throw if token is missing or invalid
    const token = accessTokenService.extractTokenFromRequest(req);
    accessTokenService.verifyAccessToken(token);

    next();
  } catch (error) {
    getErrorResponse(res, error);
  }
}

/**
 * Middleware variant that allows optional authentication
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = accessTokenService.extractTokenFromRequest(req);
    accessTokenService.verifyAccessToken(token);
    // Token is valid, continue
    next();
  } catch {
    // Continue without authentication if token is missing or invalid
    next();
  }
}

import { Request, Response } from 'express';

import { UnauthorizedException, ConflictException, BadRequestException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody } from '../helpers/parsers/index.ts';
import { refreshTokenSchema, logoutSchema } from '../helpers/validation/auth.schema.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { PasswordService } from '../services/authentication/password.service.ts';
import { RefreshTokenService } from '../services/authentication/refresh-token.service.ts';
import { GroupService } from '../services/database/group.service.ts';
import { UserPreferenceService } from '../services/database/user-preference.service.ts';
import { UserService } from '../services/database/user.service.ts';

const accessTokenService = new AccessTokenService();
const passwordService = new PasswordService();
const userService = new UserService();
const refreshTokenService = new RefreshTokenService();
const groupService = new GroupService();
const userPreferenceService = new UserPreferenceService();

export async function registerUser(req: Request, res: Response) {
  try {
    const parsedBody = parseBody(req.body) as Record<string, unknown>;
    const { group, user } = parsedBody ?? {};

    if (!group || typeof group !== 'object') {
      throw new BadRequestException('Group information is required to register a user');
    }

    if (!user || typeof user !== 'object') {
      throw new BadRequestException('User information is required to register a user');
    }

    const userObj = user as Record<string, unknown>;
    const existing = await userService.getSingle({ email: userObj.email as string });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const createdGroup = await groupService.createSingle(group);

    const passwordHash = await passwordService.hashPassword(userObj.password as string);

    const createdUser = await userService.createSingle({
      ...userObj,
      password: passwordHash,
      groupId: createdGroup.id,
    });

    // Create default user preferences
    await userPreferenceService.createDefault(createdUser.id).catch(() => {});

    const token = accessTokenService.generateAccessToken(createdUser);
    const refreshTokenValue = await refreshTokenService.generateRefreshToken(Number(createdUser.id));

    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    res.status(201).json({ token, refreshToken: refreshTokenValue, user: userWithoutPassword });
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const parsedBody = parseBody(req.body) as Record<string, unknown>;
    const user = await userService.getSingle({ email: parsedBody.email as string });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await passwordService.comparePassword(parsedBody.password as string, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = accessTokenService.generateAccessToken(user);
    const refreshTokenValue = await refreshTokenService.generateRefreshToken(Number(user.id));

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(200).json({ token, refreshToken: refreshTokenValue, user: userWithoutPassword });
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const parsedBody = parseBody(req.body) as Record<string, unknown>;

    // Validate the request body
    const validation = refreshTokenSchema.safeParse(parsedBody);
    if (!validation.success) {
      throw new BadRequestException(
        'Invalid request data: ' + validation.error.errors.map((e) => e.message).join(', ')
      );
    }

    const { refreshToken: tokenFromBody } = validation.data;

    // Validate the refresh token
    const validToken = await refreshTokenService.validateRefreshToken(tokenFromBody);
    if (!validToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get the user associated with the token
    const user = await userService.getSingle({ id: validToken.userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate the refresh token (revoke old, create new)
    const newRefreshToken = await refreshTokenService.rotateRefreshToken(tokenFromBody);
    if (!newRefreshToken) {
      throw new UnauthorizedException('Failed to rotate refresh token');
    }

    // Generate new access token
    const newAccessToken = accessTokenService.generateAccessToken(user);

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: userWithoutPassword,
    });
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const parsedBody = parseBody(req.body) as Record<string, unknown>;

    // Validate the request body
    const validation = logoutSchema.safeParse(parsedBody);
    if (!validation.success) {
      throw new BadRequestException(
        'Invalid request data: ' + validation.error.errors.map((e) => e.message).join(', ')
      );
    }

    const { refreshToken: tokenFromBody } = validation.data;

    // Validate the refresh token exists
    const validToken = await refreshTokenService.getRefreshToken(tokenFromBody);
    if (!validToken) {
      // Return success even if token doesn't exist to prevent token enumeration
      res.status(200).json({ message: 'Logged out successfully' });
      return;
    }

    // Revoke the refresh token
    await refreshTokenService.revokeRefreshToken(tokenFromBody);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export function forgotPassword(_req: Request, res: Response) {
  return res.status(501).json({ message: 'Not implemented' });
}

export function resetPassword(_req: Request, res: Response) {
  return res.status(501).json({ message: 'Not implemented' });
}

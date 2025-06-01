import { Request, Response } from 'express';

import { UnauthorizedException, ConflictException, BadRequestException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody } from '../helpers/parsers/index.ts';
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

    // Check if email is already used
    const userObj = user as Record<string, unknown>;
    const existing = await userService.getSingle({ email: userObj.email as string });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Now create the group
    const createdGroup = await groupService.createSingle(group);

    // Create user with the real groupId
    const passwordHash = await passwordService.hashPassword(userObj.password as string);

    const createdUser = await userService.createSingle({
      ...userObj,
      password: passwordHash,
      groupId: createdGroup.id,
    });

    // Create default user preferences
    await userPreferenceService.createDefault(createdUser.id).catch(() => {});

    const token = accessTokenService.generateAccessToken(createdUser);
    const refreshToken = await refreshTokenService.generateRefreshToken(Number(createdUser.id));

    const { passwordHash: _, ...userWithoutPassword } = createdUser;

    res.status(201).json({ token, refreshToken, user: userWithoutPassword });
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
    const refreshToken = await refreshTokenService.generateRefreshToken(Number(user.id));

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(200).json({ token, refreshToken, user: userWithoutPassword });
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

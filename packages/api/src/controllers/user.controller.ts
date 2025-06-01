import { Request, Response } from 'express';

import { NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { UserService } from '../services/database/user.service.ts';

const accessTokenService = new AccessTokenService();
const userService = new UserService();

export async function getMe(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const currentUser = await userService.getSingle({ id: user.id });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = currentUser;
    res.status(200).json(userWithoutPassword);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateMe(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const updatedUser = await userService.updateSingle(user.id, parseBody(req.body));

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

import { Request, Response } from 'express';

import { NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { GroupService } from '../services/database/group.service.ts';
import { UserService } from '../services/database/user.service.ts';

const accessTokenService = new AccessTokenService();
const groupService = new GroupService();
const userService = new UserService();

export async function createGroup(req: Request, res: Response) {
  try {
    const group = await groupService.createSingle(parseBody(req.body));

    res.status(201).json(group);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getGroup(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Check if user has access to this group
    if (user.groupId !== id) {
      throw new NotFoundException('Group not found or access denied');
    }

    const group = await groupService.getSingle({ id });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    res.status(200).json(group);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateGroup(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Check if user has access to this group
    if (user.groupId !== id) {
      throw new NotFoundException('Group not found or access denied');
    }

    const group = await groupService.updateSingle(id, parseBody(req.body));

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    res.status(200).json(group);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export function inviteUser(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const groupId = parseId(req.params.groupId);

    // Check if user has access to this group
    if (user.groupId !== groupId) {
      throw new NotFoundException('Group not found or access denied');
    }

    // This would typically involve creating an invitation
    // For now, return not implemented
    res.status(501).json({ message: 'User invitation not implemented yet' });
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function listGroupUsers(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const groupId = parseId(req.params.groupId);

    // Check if user has access to this group
    if (user.groupId !== groupId) {
      throw new NotFoundException('Group not found or access denied');
    }

    const { items: users } = await userService.getMany({ groupId, pageSize: 100_000 });

    // Remove password hashes from response
    const safeUsers = users.map(({ passwordHash: _passwordHash, ...userWithoutPassword }) => userWithoutPassword);

    res.status(200).json(safeUsers);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

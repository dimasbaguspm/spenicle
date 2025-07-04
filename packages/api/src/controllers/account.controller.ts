import { Request, Response } from 'express';

import { NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId, parseMultipleIds, parseQuery, parseStringArray } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { AccountService } from '../services/database/account.service.ts';

const accessTokenService = new AccessTokenService();
const accountService = new AccountService();

export async function listAccounts(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Add user's groupId to query filters
    const filters = {
      ...parseQuery(req.query),
      groupId: user.groupId, // Parse array parameters
      ids: parseMultipleIds(req.query.ids, 'account IDs'),
      types: parseStringArray(req.query.types),
    };
    const accounts = await accountService.getMany(filters);

    res.status(200).json(accounts);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function createAccount(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Ensure the account is created for the user's group
    const payload = { ...parseBody(req.body), groupId: user.groupId };

    const account = await accountService.createSingle(payload);

    res.status(201).json(account);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getAccount(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // use ids for single account retrieval
    const ids = [parseId(req.params.id)];
    const account = await accountService.getSingle({ ids, groupId: user.groupId });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    res.status(200).json(account);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateAccount(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const ids = [parseId(req.params.id)];
    // Verify account belongs to user's group
    const existingAccount = await accountService.getSingle({ ids, groupId: user.groupId });
    if (!existingAccount) {
      throw new NotFoundException('Account not found');
    }

    const account = await accountService.updateSingle(ids[0], parseBody(req.body));

    res.status(200).json(account);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function deleteAccount(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const ids = [parseId(req.params.id)];
    // Verify account belongs to user's group
    const existingAccount = await accountService.getSingle({ ids, groupId: user.groupId });
    if (!existingAccount) {
      throw new NotFoundException('Account not found');
    }

    const account = await accountService.deleteSingle(ids[0]);

    res.status(200).json(account);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

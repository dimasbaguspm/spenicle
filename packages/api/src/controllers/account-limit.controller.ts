import { Request, Response } from 'express';

import { NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId, parseQuery } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { AccountLimitService } from '../services/database/account-limit.service.ts';
import { AccountService } from '../services/database/account.service.ts';
import { TransactionService } from '../services/database/transaction.service.ts';

const accessTokenService = new AccessTokenService();
const accountLimitService = new AccountLimitService();
const accountService = new AccountService();
const transactionService = new TransactionService();

export async function listAccountLimits(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const filters = { ...parseQuery(req.query), accountId };
    const limits = await accountLimitService.getMany(filters);

    res.status(200).json(limits);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function createAccountLimit(req: Request, res: Response) {
  try {
    // Extract user data from token
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const payload = { ...parseBody(req.body), accountId };

    const limit = await accountLimitService.createSingle(payload);

    res.status(201).json(limit);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getAccountLimit(req: Request, res: Response) {
  try {
    // Extract user data from token
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);
    const limitId = parseId(req.params.limitId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const limit = await accountLimitService.getSingle({ id: limitId, accountId });
    if (!limit) {
      throw new NotFoundException('Account limit not found');
    }

    res.status(200).json(limit);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateAccountLimit(req: Request, res: Response) {
  try {
    // Extract user data from token
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);
    const limitId = parseId(req.params.limitId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Verify limit exists for this account
    const existingLimit = await accountLimitService.getSingle({ id: limitId, accountId });
    if (!existingLimit) {
      throw new NotFoundException('Account limit not found');
    }

    const limit = await accountLimitService.updateSingle(limitId, parseBody(req.body));

    res.status(200).json(limit);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function deleteAccountLimit(req: Request, res: Response) {
  try {
    // Extract user data from token
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);
    const limitId = parseId(req.params.limitId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Verify limit exists for this account
    const existingLimit = await accountLimitService.getSingle({ id: limitId, accountId });
    if (!existingLimit) {
      throw new NotFoundException('Account limit not found');
    }

    const limit = await accountLimitService.deleteSingle(limitId);

    res.status(200).json(limit);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getAccountRemainingLimit(req: Request, res: Response) {
  try {
    // Extract user data from token
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Get all limits for this account
    const { items: limits } = await accountLimitService.getMany({ accountId, pageSize: 100_000 });

    // Calculate remaining limit for each period
    const now = new Date();
    const remainingLimits = [];

    for (const limit of limits) {
      let startDate: Date;
      let endDate: Date;

      if (limit.period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (limit.period === 'week') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        startDate = new Date(now.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else {
        continue;
      }

      // Get transactions for this period
      const { items: transactions } = await transactionService.getMany({
        accountId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        pageSize: 100_000,
      });

      const totalSpent = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const remaining = Number(limit.limit) - totalSpent;

      remainingLimits.push({
        limitId: limit.id,
        period: limit.period,
        limit: limit.limit,
        spent: totalSpent,
        remaining: Math.max(0, remaining),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
    }

    res.status(200).json(remainingLimits);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

import { Request, Response } from 'express';

import { BadRequestException, NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId, parseQuery } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { AccountService } from '../services/database/account.service.ts';
import { CategoryService } from '../services/database/category.service.ts';
import { TransactionService } from '../services/database/transaction.service.ts';
import { AccountLimitValidationService } from '../services/validation/account-limit-validation.service.ts';

const accessTokenService = new AccessTokenService();
const transactionService = new TransactionService();
const accountService = new AccountService();
const categoryService = new CategoryService();
const accountLimitValidationService = new AccountLimitValidationService();

export async function listTransactions(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Add user's groupId to query filters
    const filters = { ...parseQuery(req.query), groupId: user.groupId };
    const transactions = await transactionService.getMany(filters);

    res.status(200).json(transactions);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function createTransaction(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Ensure the transaction is created for the user's group
    const parsedBody = parseBody(req.body) as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      ...parsedBody,
      groupId: user.groupId,
      createdByUserId: user.id,
    };

    // Verify account belongs to user's group
    const account = await accountService.getSingle({
      id: payload.accountId as number,
      groupId: payload.groupId as number,
    });
    if (!account) {
      throw new BadRequestException('Invalid account ID');
    }

    // Verify category belongs to user's group (if provided)
    if (payload?.categoryId) {
      const category = await categoryService.getSingle({ id: payload.categoryId as number, groupId: user.groupId });
      if (!category) {
        throw new BadRequestException('Invalid category ID');
      }
    }

    // Validate against account limits for new transaction
    const validationResult = await accountLimitValidationService.validateTransactionAgainstLimits(
      payload.accountId as number,
      payload.amount as number,
      payload.date as string,
      user.id,
      payload.type as string
    );

    if (!validationResult.isValid) {
      const limitErrors = validationResult.exceededLimits.map((exceeded) => {
        const period = exceeded.limit.period;
        const periodText = period === 'week' ? 'weekly' : 'monthly';
        return `${periodText} limit of ${exceeded.limit.limit} would be exceeded. Current spent: ${exceeded.currentSpent}, Available: ${exceeded.remainingAmount}`;
      });

      throw new BadRequestException(`Transaction would exceed account limits: ${limitErrors.join('; ')}`);
    }

    const transaction = await transactionService.createSingle(payload);

    res.status(201).json(transaction);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getTransaction(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);
    const transaction = await transactionService.getSingle({ id, groupId: user.groupId });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    res.status(200).json(transaction);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateTransaction(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Verify transaction belongs to user's group
    const existingTransaction = await transactionService.getSingle({ id, groupId: user.groupId });
    if (!existingTransaction) {
      throw new NotFoundException('Transaction not found');
    }

    const payload = parseBody(req.body) as Record<string, unknown>;

    // Verify account belongs to user's group (if being updated)
    if (payload?.accountId) {
      const account = await accountService.getSingle({
        id: payload.accountId as number,
        groupId: user.groupId,
      });
      if (!account) {
        throw new BadRequestException('Invalid account ID');
      }
    }

    // Verify category belongs to user's group (if being updated)
    if (payload?.categoryId) {
      const category = await categoryService.getSingle({
        id: payload.categoryId as number,
        groupId: user.groupId,
      });
      if (!category) {
        throw new BadRequestException('Invalid category ID');
      }
    }

    // Validate against account limits if amount, account, date, or type is being updated
    if (
      payload?.amount !== undefined ||
      payload?.accountId !== undefined ||
      payload?.date !== undefined ||
      payload?.type !== undefined
    ) {
      const validationResult = await accountLimitValidationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        payload,
        user.id
      );

      if (!validationResult.isValid) {
        const limitErrors = validationResult.exceededLimits.map((exceeded) => {
          const period = exceeded.limit.period;
          const periodText = period === 'week' ? 'weekly' : 'monthly';
          return `${periodText} limit of ${exceeded.limit.limit} would be exceeded. Current spent: ${exceeded.currentSpent}, Available: ${exceeded.remainingAmount}`;
        });

        throw new BadRequestException(`Transaction update would exceed account limits: ${limitErrors.join('; ')}`);
      }

      const transaction = await transactionService.updateSingle(id, payload);

      res.status(200).json(transaction);
    } else {
      // No fields that affect limits are being updated
      const transaction = await transactionService.updateSingle(id, payload);
      res.status(200).json(transaction);
    }
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function deleteTransaction(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const id = parseId(req.params.id);

    // Verify transaction belongs to user's group
    const existingTransaction = await transactionService.getSingle({ id, groupId: user.groupId });
    if (!existingTransaction) {
      throw new NotFoundException('Transaction not found');
    }

    const transaction = await transactionService.deleteSingle(id);

    res.status(200).json(transaction);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function listAccountTransactions(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const accountId = parseId(req.params.accountId);

    // Verify account belongs to user's group
    const account = await accountService.getSingle({ id: accountId, groupId: user.groupId });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const filters = { ...req.query, groupId: user.groupId, accountId };
    const transactions = await transactionService.getMany(filters);

    res.status(200).json(transactions);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function listCategoryTransactions(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    const categoryId = parseId(req.params.categoryId);

    // Verify category belongs to user's group
    const category = await categoryService.getSingle({ id: categoryId, groupId: user.groupId });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const filters = { ...req.query, groupId: user.groupId, categoryId };
    const transactions = await transactionService.getMany(filters);

    res.status(200).json(transactions);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

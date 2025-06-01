import { Request, Response } from 'express';

import { BadRequestException, NotFoundException } from '../helpers/exceptions/index.ts';
import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseBody, parseId } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { RecurrenceService } from '../services/database/recurrence.service.ts';
import { TransactionService } from '../services/database/transaction.service.ts';

const accessTokenService = new AccessTokenService();
const recurrenceService = new RecurrenceService();
const transactionService = new TransactionService();

export async function getTransactionRecurrence(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const transactionId = parseId(req.params.transactionId);

    // Verify transaction belongs to user's group
    const transaction = await transactionService.getSingle({ id: transactionId, groupId: user.groupId });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if transaction has a recurrence
    if (!transaction.recurrenceId) {
      throw new NotFoundException('Transaction does not have a recurrence');
    }

    const recurrence = await recurrenceService.getSingle({ id: transaction.recurrenceId });
    if (!recurrence) {
      throw new NotFoundException('Recurrence not found');
    }

    res.status(200).json(recurrence);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function createTransactionRecurrence(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const transactionId = parseId(req.params.transactionId);

    // Verify transaction belongs to user's group
    const transaction = await transactionService.getSingle({ id: transactionId, groupId: user.groupId });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if transaction already has a recurrence
    if (transaction.recurrenceId) {
      throw new BadRequestException('Transaction already has a recurrence');
    }

    const payload = parseBody(req.body);

    // Create the recurrence
    const recurrence = await recurrenceService.createSingle(payload);

    // Update the transaction to link it to the recurrence
    await transactionService.updateSingle(transactionId, { recurrenceId: recurrence.id });

    res.status(201).json(recurrence);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function updateTransactionRecurrence(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const transactionId = parseId(req.params.transactionId);

    // Verify transaction belongs to user's group
    const transaction = await transactionService.getSingle({ id: transactionId, groupId: user.groupId });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if transaction has a recurrence
    if (!transaction.recurrenceId) {
      throw new NotFoundException('Transaction does not have a recurrence');
    }

    const payload = parseBody(req.body);
    const recurrence = await recurrenceService.updateSingle(transaction.recurrenceId, payload);

    res.status(200).json(recurrence);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function deleteTransactionRecurrence(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const transactionId = parseId(req.params.transactionId);

    // Verify transaction belongs to user's group
    const transaction = await transactionService.getSingle({ id: transactionId, groupId: user.groupId });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if transaction has a recurrence
    if (!transaction.recurrenceId) {
      throw new NotFoundException('Transaction does not have a recurrence');
    }

    const recurrenceId = transaction.recurrenceId;

    // Remove the recurrence reference from the transaction
    await transactionService.updateSingle(transactionId, { recurrenceId: null });

    // Delete the recurrence
    const recurrence = await recurrenceService.deleteSingle(recurrenceId);

    res.status(200).json(recurrence);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

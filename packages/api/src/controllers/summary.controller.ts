import { Request, Response } from 'express';

import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseQuery } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { SummaryService } from '../services/database/summary.service.ts';

const accessTokenService = new AccessTokenService();
const summaryService = new SummaryService();

export async function getSummaryCategoriesPeriod(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const parsedQuery = parseQuery(req.query);
    const { startDate, endDate, accountId, sortBy, sortOrder } = parsedQuery ?? {};
    const result = await summaryService.getCategoriesPeriod({
      groupId: user.groupId,
      startDate,
      endDate,
      accountId,
      sortBy,
      sortOrder,
    });
    res.status(200).json(result);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getSummaryAccountsPeriod(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const parsedQuery = parseQuery(req.query);
    const { startDate, endDate, categoryId, sortBy, sortOrder } = parsedQuery ?? {};
    const result = await summaryService.getAccountsPeriod({
      groupId: user.groupId,
      startDate,
      endDate,
      categoryId,
      sortBy,
      sortOrder,
    });
    res.status(200).json(result);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

export async function getSummaryTransactionsPeriod(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);
    const parsedQuery = parseQuery(req.query);
    const { startDate, endDate, sortBy, sortOrder } = parsedQuery ?? {};
    const result = await summaryService.getTransactionsPeriod({
      groupId: user.groupId,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
    res.status(200).json(result);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

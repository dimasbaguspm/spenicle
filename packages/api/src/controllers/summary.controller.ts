import { Request, Response } from 'express';

import { getErrorResponse } from '../helpers/http-response/index.ts';
import { parseQuery } from '../helpers/parsers/index.ts';
import { AccessTokenService } from '../services/authentication/access-token.service.ts';
import { AccountService } from '../services/database/account.service.ts';
import { CategoryService } from '../services/database/category.service.ts';
import { TransactionService } from '../services/database/transaction.service.ts';

const accessTokenService = new AccessTokenService();
const accountService = new AccountService();
const categoryService = new CategoryService();
const transactionService = new TransactionService();

export async function getSummary(req: Request, res: Response) {
  try {
    const user = accessTokenService.getUserFromRequest(req);

    // Get query parameters for date range
    const parsedQuery = parseQuery(req.query);
    const { startDate, endDate } = parsedQuery ?? {};

    // Get all transactions for the user's group within date range
    const transactionFilters: { groupId: number; startDate?: string; endDate?: string } = { groupId: user.groupId };

    if (startDate && typeof startDate === 'string') transactionFilters.startDate = startDate;
    if (endDate && typeof endDate === 'string') transactionFilters.endDate = endDate;

    const { items: transactions } = await transactionService.getMany({ ...transactionFilters, pageSize: 100_000 });
    const { items: accounts } = await accountService.getMany({ groupId: user.groupId, pageSize: 100_000 });
    const { items: categories } = await categoryService.getMany({ groupId: user.groupId, pageSize: 100_000 });

    // Calculate summary statistics
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const averageTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Group by account
    const byAccount = accounts.map((account) => {
      const accountTransactions = transactions.filter((t) => t.accountId === account.id);
      const total = accountTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        transactionCount: accountTransactions.length,
        totalAmount: total,
      };
    });

    // Group by category
    const byCategory = categories.map((category) => {
      const categoryTransactions = transactions.filter((t) => t.categoryId === category.id);
      const total = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        categoryId: category.id,
        categoryName: category.name,
        parentId: category.parentId,
        transactionCount: categoryTransactions.length,
        totalAmount: total,
      };
    });

    // Add uncategorized transactions
    const uncategorizedTransactions = transactions.filter((t) => !t.categoryId);
    if (uncategorizedTransactions.length > 0) {
      byCategory.push({
        categoryId: 0,
        categoryName: 'Uncategorized',
        parentId: null,
        transactionCount: uncategorizedTransactions.length,
        totalAmount: uncategorizedTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
      });
    }

    // Group by date (daily)
    const dailySummary: { [key: string]: { count: number; total: number } } = {};
    transactions.forEach((transaction) => {
      const date = transaction.date.toString();
      if (!dailySummary[date]) {
        dailySummary[date] = { count: 0, total: 0 };
      }
      dailySummary[date].count++;
      dailySummary[date].total += Number(transaction.amount);
    });

    const byDate = Object.entries(dailySummary)
      .map(([date, data]) => ({
        date,
        transactionCount: data.count,
        totalAmount: data.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary = {
      overview: {
        totalTransactions,
        totalAmount,
        averageTransaction,
        dateRange: {
          startDate: startDate ?? null,
          endDate: endDate ?? null,
        },
      },
      byAccount: byAccount.filter((a) => a.transactionCount > 0),
      byCategory: byCategory.filter((c) => c.transactionCount > 0),
      byDate,
    };

    res.status(200).json(summary);
  } catch (err) {
    getErrorResponse(res, err);
  }
}

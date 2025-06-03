import { SQL, and, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { summaryPeriodQuerySchema, validate } from '../../helpers/validation/index.ts';
import {
  SummaryCategoryPeriod,
  transactions,
  categories,
  SummaryAccountPeriod,
  accounts,
  SummaryTransactionPeriod,
} from '../../models/schema.ts';

export class SummaryService {
  async getCategoriesPeriod(payload: unknown): Promise<SummaryCategoryPeriod[]> {
    const { data } = await validate(summaryPeriodQuerySchema, payload ?? {});
    const { startDate, endDate, accountId, sortBy = '', sortOrder = 'desc' } = data ?? {};

    const conditions: SQL[] = [];
    if (startDate !== undefined) conditions.push(gte(transactions.date, startDate));
    if (endDate !== undefined) conditions.push(lte(transactions.date, endDate));
    if (accountId !== undefined) conditions.push(eq(transactions.accountId, accountId));

    // Join categories and transactions, aggregate by category
    const rows = await db
      .select({
        categoryId: categories.id,
        totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END`).as(
          'totalIncome'
        ),
        totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END`).as(
          'totalExpenses'
        ),
        totalTransactions: sum(sql`CASE WHEN ${transactions.id} IS NOT NULL THEN 1 ELSE 0 END`).as('totalTransactions'),
      })
      .from(categories)
      .leftJoin(transactions, eq(categories.id, transactions.categoryId))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(categories.id);

    // Map to SummaryCategoryPeriod
    let result: SummaryCategoryPeriod[] = rows.map((row) => {
      const totalIncome = Number(row.totalIncome ?? 0);
      const totalExpenses = Number(row.totalExpenses ?? 0);
      return {
        categoryId: row.categoryId,
        startDate,
        endDate,
        totalIncome,
        totalExpenses,
        totalNet: totalIncome - totalExpenses,
        totalTransactions: Number(row.totalTransactions ?? 0),
      };
    });

    // Manual sort if needed
    if (sortBy && ['totalIncome', 'totalExpenses', 'totalNet'].includes(sortBy)) {
      result = result.sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1;
        return (
          dir * (Number(b[sortBy as keyof SummaryCategoryPeriod]) - Number(a[sortBy as keyof SummaryCategoryPeriod]))
        );
      });
    }

    return result;
  }

  async getAccountsPeriod(payload: unknown): Promise<SummaryAccountPeriod[]> {
    const { data } = await validate(summaryPeriodQuerySchema, payload ?? {});
    const { startDate, endDate, categoryId, sortBy = '', sortOrder = 'desc' } = data ?? {};

    const conditions: SQL[] = [];
    if (startDate !== undefined) conditions.push(gte(transactions.date, startDate));
    if (endDate !== undefined) conditions.push(lte(transactions.date, endDate));
    if (categoryId !== undefined) conditions.push(eq(transactions.categoryId, categoryId));

    // Join accounts and transactions, aggregate by account
    const rows = await db
      .select({
        accountId: accounts.id,
        totalIncome: sum(sql`CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END`).as(
          'totalIncome'
        ),
        totalExpenses: sum(sql`CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END`).as(
          'totalExpenses'
        ),
        totalTransactions: sum(sql`CASE WHEN ${transactions.id} IS NOT NULL THEN 1 ELSE 0 END`).as('totalTransactions'),
      })
      .from(accounts)
      .leftJoin(transactions, eq(accounts.id, transactions.accountId))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(accounts.id);

    let result: SummaryAccountPeriod[] = rows.map((row) => {
      const totalIncome = Number(row.totalIncome ?? 0);
      const totalExpenses = Number(row.totalExpenses ?? 0);
      return {
        accountId: row.accountId,
        startDate,
        endDate,
        totalIncome,
        totalExpenses,
        totalNet: totalIncome - totalExpenses,
        totalTransactions: Number(row.totalTransactions ?? 0),
      };
    });

    if (sortBy && ['totalIncome', 'totalExpenses', 'totalNet'].includes(sortBy)) {
      result = result.sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1;
        return (
          dir * (Number(b[sortBy as keyof SummaryAccountPeriod]) - Number(a[sortBy as keyof SummaryAccountPeriod]))
        );
      });
    }

    return result;
  }

  async getTransactionsPeriod(payload: unknown): Promise<SummaryTransactionPeriod[]> {
    const { data } = await validate(summaryPeriodQuerySchema, payload ?? {});
    const { startDate, endDate, sortBy = '' } = data ?? {};

    if (!startDate || !endDate) return [];

    // Query all transactions grouped by day in the range
    const queryResult = await db.execute(sql`
      SELECT
        date_trunc('day', ${transactions.date}) AS period_day,
        SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END) AS total_income,
        SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END) AS total_expenses,
        COUNT(${transactions.id}) AS total_transactions
      FROM ${transactions}
      WHERE ${transactions.date} >= ${startDate} AND ${transactions.date} <= ${endDate}
      GROUP BY period_day
      ORDER BY period_day ASC
    `);

    // Map query results by period_day for quick lookup
    const periodMap = new Map<string, { total_income: number; total_expenses: number; total_transactions: number }>();
    for (const row of queryResult.rows) {
      periodMap.set(new Date(row.period_day as string).toISOString().slice(0, 10), {
        total_income: Number(row.total_income ?? 0),
        total_expenses: Number(row.total_expenses ?? 0),
        total_transactions: Number(row.total_transactions ?? 0),
      });
    }

    // Build all daily intervals between startDate and endDate
    const intervals: SummaryTransactionPeriod[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (current <= endDay) {
      const dayKey = current.toISOString().slice(0, 10);
      const periodData = periodMap.get(dayKey) ?? { total_income: 0, total_expenses: 0, total_transactions: 0 };
      intervals.push({
        startDate: current.toISOString(),
        endDate: current.toISOString(),
        totalIncome: periodData.total_income,
        totalExpenses: periodData.total_expenses,
        netAmount: periodData.total_income - periodData.total_expenses,
        totalTransactions: periodData.total_transactions,
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Manual sort if needed
    if (sortBy && ['totalIncome', 'totalExpenses', 'netAmount', 'totalTransactions'].includes(sortBy)) {
      intervals.sort((a, b) => {
        const dir = sortBy === 'asc' ? 1 : -1;
        return (
          dir *
          (Number(b[sortBy as keyof SummaryTransactionPeriod]) - Number(a[sortBy as keyof SummaryTransactionPeriod]))
        );
      });
    }

    return intervals;
  }
}

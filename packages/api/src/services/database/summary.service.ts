import dayjs from 'dayjs';
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
    const { groupId, startDate, endDate, categoryId, accountId, sortBy = '', sortOrder = 'desc' } = data ?? {};

    // build category where conditions - ensure categories belong to the group
    const categoryConditions: SQL[] = [eq(categories.groupId, groupId)];
    if (categoryId !== undefined) categoryConditions.push(eq(categories.id, categoryId));

    // build transaction join conditions - ensure transactions belong to the same group
    const transactionJoinConditions: SQL[] = [
      eq(categories.id, transactions.categoryId),
      eq(transactions.groupId, groupId), // critical: ensure transaction groupId matches
    ];
    if (startDate !== undefined) transactionJoinConditions.push(gte(transactions.date, startDate));
    if (endDate !== undefined) transactionJoinConditions.push(lte(transactions.date, endDate));
    if (accountId !== undefined) transactionJoinConditions.push(eq(transactions.accountId, accountId));

    // join categories and transactions, aggregate by category with double groupId filtering
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
      .leftJoin(transactions, and(...transactionJoinConditions))
      .where(and(...categoryConditions))
      .groupBy(categories.id);

    let result: SummaryCategoryPeriod[] = rows.map((row, idx) => {
      const totalIncome = Number(row.totalIncome ?? 0);
      const totalExpenses = Number(row.totalExpenses ?? 0);

      const baseDate = dayjs(startDate).add(idx, 'day');
      const isoStartDate = baseDate.startOf('day').toISOString();
      const isoEndDate = baseDate.endOf('day').toISOString();

      return {
        categoryId: row.categoryId,
        startDate: isoStartDate,
        endDate: isoEndDate,
        totalIncome,
        totalExpenses,
        totalNet: totalIncome - totalExpenses,
        totalTransactions: Number(row.totalTransactions ?? 0),
      };
    });

    // sort if needed
    if (sortBy && ['totalIncome', 'totalExpenses', 'totalNet', 'totalTransactions'].includes(sortBy)) {
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
    const { groupId, startDate, endDate, categoryId, sortBy = '', sortOrder = 'desc' } = data ?? {};

    // build account where conditions - ensure accounts belong to the group
    const accountConditions: SQL[] = [eq(accounts.groupId, groupId)];

    // build transaction join conditions - ensure transactions belong to the same group
    const transactionJoinConditions: SQL[] = [
      eq(accounts.id, transactions.accountId),
      eq(transactions.groupId, groupId), // critical: ensure transaction groupId matches
    ];
    if (startDate !== undefined) transactionJoinConditions.push(gte(transactions.date, startDate));
    if (endDate !== undefined) transactionJoinConditions.push(lte(transactions.date, endDate));
    if (categoryId !== undefined) transactionJoinConditions.push(eq(transactions.categoryId, categoryId));

    // Join accounts and transactions, aggregate by account with double groupId filtering
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
      .leftJoin(transactions, and(...transactionJoinConditions))
      .where(and(...accountConditions))
      .groupBy(accounts.id);

    let result: SummaryAccountPeriod[] = rows.map((row, idx) => {
      const totalIncome = Number(row.totalIncome ?? 0);
      const totalExpenses = Number(row.totalExpenses ?? 0);

      const baseDate = dayjs(startDate).add(idx, 'day');
      const isoStartDate = baseDate.startOf('day').toISOString();
      const isoEndDate = baseDate.endOf('day').toISOString();

      return {
        accountId: row.accountId,
        startDate: isoStartDate,
        endDate: isoEndDate,
        totalIncome,
        totalExpenses,
        totalNet: totalIncome - totalExpenses,
        totalTransactions: Number(row.totalTransactions ?? 0),
      };
    });

    if (sortBy && ['totalIncome', 'totalExpenses', 'totalNet', 'totalTransactions'].includes(sortBy)) {
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
    const { startDate, endDate, groupId, sortBy = '', sortOrder = 'desc' } = data ?? {};

    if (!startDate || !endDate) return [];

    // build transaction where conditions - ensure secure groupId filtering
    const transactionConditions: SQL[] = [eq(transactions.groupId, groupId)];
    transactionConditions.push(gte(transactions.date, startDate));
    transactionConditions.push(lte(transactions.date, endDate));

    // Query all transactions grouped by day in the range using drizzle query builder
    const queryResult = await db.execute(sql`
      SELECT
        date_trunc('day', ${transactions.date}) AS period_day,
        SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END) AS total_income,
        SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END) AS total_expenses,
        COUNT(${transactions.id}) AS total_transactions
      FROM ${transactions}
      WHERE ${transactions.groupId} = ${groupId} 
        AND ${transactions.date} >= ${startDate} 
        AND ${transactions.date} <= ${endDate}
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
      // use dayjs for consistent date formatting
      const baseDate = dayjs(current);
      intervals.push({
        startDate: baseDate.startOf('day').toISOString(),
        endDate: baseDate.endOf('day').toISOString(),
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
        const dir = sortOrder === 'asc' ? 1 : -1;
        return (
          dir *
          (Number(b[sortBy as keyof SummaryTransactionPeriod]) - Number(a[sortBy as keyof SummaryTransactionPeriod]))
        );
      });
    }

    return intervals;
  }
}

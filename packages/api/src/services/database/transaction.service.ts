import { SQL, and, asc, desc, eq, gte, ilike, lte, inArray } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatTransactionModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import { validate } from '../../helpers/validation/index.ts';
import {
  transactionQuerySchema,
  createTransactionSchema,
  updateTransactionSchema,
  CreateTransactionInput,
} from '../../helpers/validation/transaction.schema.ts';
import { PagedTransactions, Transaction, transactions } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class TransactionService implements DatabaseServiceSchema<Transaction> {
  /**
   * Get many transactions with optional filters, sorting, and pagination
   */
  async getMany(filters?: unknown): Promise<PagedTransactions> {
    const { data } = await validate(transactionQuerySchema, filters ?? {});
    const {
      ids,
      groupId,
      accountIds,
      categoryIds,
      startDate,
      endDate,
      note,
      type,
      isHighlighted,
      pageNumber = 1,
      pageSize = 25,
      sortBy = 'createdAt',
      sortOrder = 'asc',
    } = data;

    const conditions: SQL[] = [];

    // Group ID filter (kept as single since it's for scoping)
    if (groupId !== undefined) conditions.push(eq(transactions.groupId, groupId));

    // Multiple ID filters
    if (ids !== undefined && ids.length > 0) conditions.push(inArray(transactions.id, ids));
    if (accountIds !== undefined && accountIds.length > 0) conditions.push(inArray(transactions.accountId, accountIds));
    if (categoryIds !== undefined && categoryIds.length > 0)
      conditions.push(inArray(transactions.categoryId, categoryIds));

    // Other filters
    if (startDate !== undefined) conditions.push(gte(transactions.date, startDate));
    if (endDate !== undefined) conditions.push(lte(transactions.date, endDate));
    if (note !== undefined) conditions.push(ilike(transactions.note, `%${note}%`));
    if (type !== undefined) conditions.push(eq(transactions.type, type));
    if (isHighlighted !== undefined) conditions.push(eq(transactions.isHighlighted, isHighlighted));

    // Sorting
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'amount':
        order = isAscending ? asc(transactions.amount) : desc(transactions.amount);
        break;
      case 'date':
        order = isAscending ? asc(transactions.date) : desc(transactions.date);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(transactions.createdAt) : desc(transactions.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('TRANSACTION_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('TRANSACTION_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatTransactionModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } satisfies PagedTransactions;
  }

  /**
   * Get a single transaction by id with optional filters
   */
  async getSingle(filters?: unknown) {
    const { data } = await validate(transactionQuerySchema, filters ?? {});

    const { groupId, ids, accountIds, categoryIds } = data;

    const conditions: SQL[] = [];

    if (groupId) conditions.push(eq(transactions.groupId, groupId));

    // For getSingle, we expect exactly one ID in the arrays
    if (ids && ids.length > 0) conditions.push(eq(transactions.id, ids[0]));
    if (accountIds && accountIds.length > 0) conditions.push(eq(transactions.accountId, accountIds[0]));
    if (categoryIds && categoryIds.length > 0) conditions.push(eq(transactions.categoryId, categoryIds[0]));

    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(...conditions));
    return formatTransactionModel(transaction);
  }

  /**
   * Create a single transaction
   */
  async createSingle(payload: unknown) {
    const { data } = await validate(createTransactionSchema, payload);

    if (data.amount === undefined || data.amount === null) {
      throw new Error('amount is required');
    }
    if (data.categoryId === undefined || data.categoryId === null) {
      throw new Error('categoryId is required');
    }

    const insertData = {
      ...data,
      amount: data.amount,
      categoryId: data.categoryId,
    } satisfies CreateTransactionInput;

    const [transaction] = await db.insert(transactions).values(insertData).returning();
    return formatTransactionModel(transaction);
  }

  /**
   * Update a single transaction by id
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);

    const { data } = await validate(updateTransactionSchema, payload);

    const updateData = {
      ...data,
      amount: data.amount,
      updatedAt: new Date().toISOString(),
    };
    const [transaction] = await db.update(transactions).set(updateData).where(eq(transactions.id, idNum)).returning();
    return formatTransactionModel(transaction);
  }

  /**
   * Delete a single transaction by id
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);
    const [transaction] = await db.delete(transactions).where(eq(transactions.id, idNum)).returning();
    return formatTransactionModel(transaction);
  }
}

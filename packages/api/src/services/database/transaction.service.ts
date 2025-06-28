import { SQL, and, asc, desc, eq, gte, ilike, lte, inArray } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import {
  generatePrepareStatementKey,
  createConditionEntry,
  type ConditionEntry,
} from '../../helpers/database/index.ts';
import { formatTransactionModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import { validate } from '../../helpers/validation/index.ts';
import {
  transactionQuerySchema,
  createTransactionSchema,
  updateTransactionSchema,
  CreateTransactionInput,
} from '../../helpers/validation/transaction.schema.ts';
import { PagedTransactions, Transaction, transactions, accounts } from '../../models/schema.ts';
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
      types,
      isHighlighted,
      pageNumber = 1,
      pageSize = 25,
      sortBy = 'createdAt',
      sortOrder = 'asc',
    } = data;

    const conditions: SQL[] = [];
    const conditionsForKey: ConditionEntry[] = [];

    // centralized condition building - build both arrays in one pass
    if (groupId !== undefined) {
      conditions.push(eq(transactions.groupId, groupId));
      conditionsForKey.push(createConditionEntry('groupId', groupId));
    }

    if (ids !== undefined && ids.length > 0) {
      conditions.push(inArray(transactions.id, ids));
      conditionsForKey.push(createConditionEntry('ids', ids));
    }

    if (accountIds !== undefined && accountIds.length > 0) {
      conditions.push(inArray(transactions.accountId, accountIds));
      conditionsForKey.push(createConditionEntry('accountIds', accountIds));
    }

    if (categoryIds !== undefined && categoryIds.length > 0) {
      conditions.push(inArray(transactions.categoryId, categoryIds));
      conditionsForKey.push(createConditionEntry('categoryIds', categoryIds));
    }

    if (startDate !== undefined) {
      conditions.push(gte(transactions.date, startDate));
      conditionsForKey.push(createConditionEntry('startDate', startDate));
    }

    if (endDate !== undefined) {
      conditions.push(lte(transactions.date, endDate));
      conditionsForKey.push(createConditionEntry('endDate', endDate));
    }

    if (note !== undefined) {
      conditions.push(ilike(transactions.note, `%${note}%`));
      conditionsForKey.push(createConditionEntry('note', note));
    }

    if (types !== undefined) {
      conditions.push(inArray(transactions.type, types));
      conditionsForKey.push(createConditionEntry('types', types));
    }

    if (isHighlighted !== undefined) {
      conditions.push(eq(transactions.isHighlighted, isHighlighted));
      conditionsForKey.push(createConditionEntry('isHighlighted', isHighlighted));
    }

    // sorting logic
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

    const pagedQueryKey = generatePrepareStatementKey({
      prefix: 'TRANSACTION_PAGED',
      conditions: conditionsForKey,
      sortBy,
      sortOrder,
      pageNumber,
      pageSize,
    });

    const totalQueryKey = generatePrepareStatementKey({
      prefix: 'TRANSACTION_TOTAL',
      conditions: conditionsForKey,
    });

    const pagedQuery = db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare(pagedQueryKey);

    const totalQuery = db
      .select()
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare(totalQueryKey);

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
   * Create a single transaction with automatic account amount update
   * Uses database transaction for atomicity
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

    // Execute within database transaction for consistency
    return await db.transaction(async (tx) => {
      // Create the transaction record
      const [transaction] = await tx.insert(transactions).values(insertData).returning();

      // Calculate account amount change based on transaction type
      const amountChange = this.calculateAccountAmountChange(data.type, data.amount);

      // Update account amount if not a transfer (transfers handled separately)
      if (data.type !== 'transfer') {
        await this.updateAccountAmount(data.accountId, amountChange, tx);
      }

      return formatTransactionModel(transaction);
    });
  }

  /**
   * Update a single transaction by id with automatic account amount adjustment
   * Uses database transaction for atomicity
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);
    const { data } = await validate(updateTransactionSchema, payload);

    return await db.transaction(async (tx) => {
      // Get the existing transaction to calculate amount differences
      const [existingTransaction] = await tx.select().from(transactions).where(eq(transactions.id, idNum));

      if (!existingTransaction) {
        throw new Error(`Transaction with ID ${idNum} not found`);
      }

      // Calculate the difference for account amount adjustment
      const oldAmountChange = this.calculateAccountAmountChange(existingTransaction.type, existingTransaction.amount);

      const newAmount = data.amount ?? existingTransaction.amount;
      const newType = data.type ?? existingTransaction.type;
      const newAmountChange = this.calculateAccountAmountChange(newType, newAmount);

      // Net change to apply to account
      const netAccountChange = newAmountChange - oldAmountChange;

      // Update transaction
      const updateData = {
        ...data,
        amount: data.amount,
        updatedAt: new Date().toISOString(),
      };

      const [transaction] = await tx.update(transactions).set(updateData).where(eq(transactions.id, idNum)).returning();

      // Update account amount if there's a net change and not a transfer
      if (netAccountChange !== 0 && newType !== 'transfer') {
        await this.updateAccountAmount(existingTransaction.accountId, netAccountChange, tx);
      }

      return formatTransactionModel(transaction);
    });
  }

  /**
   * Delete a single transaction by id with automatic account amount adjustment
   * Uses database transaction for atomicity
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);

    return await db.transaction(async (tx) => {
      // Get the existing transaction before deletion
      const [existingTransaction] = await tx.select().from(transactions).where(eq(transactions.id, idNum));

      if (!existingTransaction) {
        throw new Error(`Transaction with ID ${idNum} not found`);
      }

      // Calculate the reverse amount change to revert the account balance
      const amountChange = this.calculateAccountAmountChange(existingTransaction.type, existingTransaction.amount);
      const reverseAmountChange = -amountChange;

      // Delete the transaction
      const [transaction] = await tx.delete(transactions).where(eq(transactions.id, idNum)).returning();

      // Revert account amount if not a transfer
      if (existingTransaction.type !== 'transfer') {
        await this.updateAccountAmount(existingTransaction.accountId, reverseAmountChange, tx);
      }

      return formatTransactionModel(transaction);
    });
  }

  /**
   * Update account amount based on transaction type
   * - Income: increases account amount
   * - Expense: decreases account amount
   * - Transfer: handled by separate transfer logic
   */
  private calculateAccountAmountChange(transactionType: string, amount: number): number {
    switch (transactionType) {
      case 'income':
        return amount; // add to account
      case 'expense':
        return -amount; // subtract from account
      case 'transfer':
        // transfers are handled separately as they affect two accounts
        return 0;
      default:
        throw new Error(`Invalid transaction type: ${transactionType}`);
    }
  }

  /**
   * Update account amount with database locking for consistency
   * Uses SELECT FOR UPDATE to ensure atomicity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async updateAccountAmount(accountId: number, amountChange: number, transaction?: any): Promise<void> {
    const dbInstance = transaction ?? db;

    // Lock the account row for update to prevent race conditions
    const [lockedAccount] = await dbInstance.select().from(accounts).where(eq(accounts.id, accountId)).for('update');

    if (!lockedAccount) {
      throw new Error(`Account with ID ${accountId} not found`);
    }

    // Calculate new amount
    const newAmount = lockedAccount.amount + amountChange;

    // Update account amount
    await dbInstance
      .update(accounts)
      .set({
        amount: newAmount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(accounts.id, accountId));
  }
}

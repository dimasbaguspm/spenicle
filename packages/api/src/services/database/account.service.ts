import { SQL, and, asc, desc, eq, ilike, inArray } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import {
  generatePrepareStatementKey,
  createConditionEntry,
  type ConditionEntry,
} from '../../helpers/database/index.ts';
import { formatAccountModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import {
  accountQuerySchema,
  createAccountSchema,
  updateAccountSchema,
} from '../../helpers/validation/account.schema.ts';
import { validate } from '../../helpers/validation/index.ts';
import { Account, accounts, NewAccount, UpdateAccount, PagedAccounts } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class AccountService implements DatabaseServiceSchema<Account> {
  async getMany(filters?: unknown): Promise<PagedAccounts> {
    const { data } = await validate(accountQuerySchema, filters ?? {});

    const { ids, groupId, name, types, pageNumber = 1, pageSize = 25, sortBy = 'createdAt', sortOrder = 'asc' } = data;

    const conditions: SQL[] = [];
    const conditionsForKey: ConditionEntry[] = [];

    // centralized condition building - build both arrays in one pass
    if (ids?.length) {
      conditions.push(inArray(accounts.id, ids));
      conditionsForKey.push(createConditionEntry('ids', ids));
    }

    if (groupId) {
      conditions.push(eq(accounts.groupId, groupId));
      conditionsForKey.push(createConditionEntry('groupId', groupId));
    }

    if (name) {
      conditions.push(ilike(accounts.name, `%${name}%`));
      conditionsForKey.push(createConditionEntry('name', name));
    }

    if (types?.length) {
      conditions.push(inArray(accounts.type, types));
      conditionsForKey.push(createConditionEntry('types', types));
    }

    // sorting logic
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'name':
        order = isAscending ? asc(accounts.name) : desc(accounts.name);
        break;
      case 'type':
        order = isAscending ? asc(accounts.type) : desc(accounts.type);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(accounts.createdAt) : desc(accounts.createdAt);
        break;
    }

    const pagedQueryKey = generatePrepareStatementKey({
      prefix: 'ACCOUNT_PAGED',
      conditions: conditionsForKey,
      sortBy,
      sortOrder,
      pageNumber,
      pageSize,
    });

    const totalQueryKey = generatePrepareStatementKey({
      prefix: 'ACCOUNT_TOTAL',
      conditions: conditionsForKey,
    });

    const pagedQuery = db
      .select()
      .from(accounts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare(pagedQueryKey);

    const totalQuery = db
      .select()
      .from(accounts)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare(totalQueryKey);

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatAccountModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } as PagedAccounts;
  }

  async getSingle(filters?: unknown): Promise<Account> {
    const { data } = await validate(accountQuerySchema, filters ?? {});

    const { groupId, name, types, ids } = data;

    const conditions: SQL[] = [];
    if (ids?.length) conditions.push(inArray(accounts.id, ids));
    if (groupId) conditions.push(eq(accounts.groupId, groupId));
    if (name) conditions.push(ilike(accounts.name, `%${name}%`));
    if (types?.length) conditions.push(inArray(accounts.type, types));

    const [account] = await db
      .select()
      .from(accounts)
      .where(and(...conditions));

    return formatAccountModel(account);
  }

  async createSingle(payload: unknown): Promise<Account> {
    const { data } = await validate(createAccountSchema, payload);

    const insertData = {
      name: data.name,
      type: data.type,
      groupId: data.groupId,
      amount: data.amount ?? 0,
      note: data.note,
      metadata: data.metadata ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies NewAccount;

    const [account] = await db.insert(accounts).values(insertData).returning();

    return formatAccountModel(account);
  }

  async updateSingle(id: unknown, payload: unknown): Promise<Account> {
    const idNum = parseId(id);
    const { data } = await validate(updateAccountSchema, payload);

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    } satisfies UpdateAccount;

    const [account] = await db.update(accounts).set(updateData).where(eq(accounts.id, idNum)).returning();

    return formatAccountModel(account);
  }

  async deleteSingle(id: unknown): Promise<Account> {
    const idNum = parseId(id);
    const [account] = await db.delete(accounts).where(eq(accounts.id, idNum)).returning();

    return formatAccountModel(account);
  }
}

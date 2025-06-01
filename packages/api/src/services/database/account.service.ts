import { SQL, and, asc, desc, eq, ilike } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
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

    const { id, groupId, name, type, pageNumber = 1, pageSize = 25, sortBy = 'createdAt', sortOrder = 'asc' } = data;

    const conditions: SQL[] = [];
    if (id) conditions.push(eq(accounts.id, id));
    if (groupId) conditions.push(eq(accounts.groupId, groupId));
    if (name) conditions.push(ilike(accounts.name, `%${name}%`));
    if (type) conditions.push(eq(accounts.type, type));

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

    const pagedQuery = db
      .select()
      .from(accounts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('ACCOUNT_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(accounts)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('ACCOUNT_TOTAL_QUERY');

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

    const { groupId, name, type, id } = data;

    const conditions: SQL[] = [];
    if (id) conditions.push(eq(accounts.id, id));
    if (groupId) conditions.push(eq(accounts.groupId, groupId));
    if (name) conditions.push(ilike(accounts.name, `%${name}%`));
    if (type) conditions.push(eq(accounts.type, type));

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

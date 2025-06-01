import { SQL, and, asc, desc, eq } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatAccountLimitModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import {
  accountLimitQuerySchema,
  createAccountLimitSchema,
  updateAccountLimitSchema,
} from '../../helpers/validation/account-limit.schema.ts';
import { validate } from '../../helpers/validation/index.ts';
import {
  accountLimits,
  AccountLimit,
  NewAccountLimit,
  UpdateAccountLimit,
  PagedAccountLimits,
} from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class AccountLimitService implements DatabaseServiceSchema<AccountLimit> {
  async getMany(filters?: unknown): Promise<PagedAccountLimits> {
    const { data } = await validate(accountLimitQuerySchema, filters ?? {});

    const { id, accountId, period, sortBy = 'createdAt', sortOrder = 'asc', pageSize = 25, pageNumber = 1 } = data;

    // Filtering
    const conditions: SQL[] = [];
    if (id) conditions.push(eq(accountLimits.id, id));
    if (accountId) conditions.push(eq(accountLimits.accountId, accountId));
    if (period) conditions.push(eq(accountLimits.period, period));

    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'period':
        order = isAscending ? asc(accountLimits.period) : desc(accountLimits.period);
        break;
      case 'limit':
        order = isAscending ? asc(accountLimits.limit) : desc(accountLimits.limit);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(accountLimits.createdAt) : desc(accountLimits.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(accountLimits)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('ACC_LIMIT_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(accountLimits)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('ACC_LIMIT_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatAccountLimitModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } as PagedAccountLimits;
  }

  async getSingle(filters?: unknown): Promise<AccountLimit> {
    const { data } = await validate(accountLimitQuerySchema, filters ?? {});

    const { id, accountId, period } = data;

    const conditions: SQL[] = [];
    if (id) conditions.push(eq(accountLimits.id, id));
    if (accountId) conditions.push(eq(accountLimits.accountId, accountId));
    if (period) conditions.push(eq(accountLimits.period, period));

    const [limit] = await db
      .select()
      .from(accountLimits)
      .where(and(...conditions));

    return formatAccountLimitModel(limit);
  }

  async createSingle(payload: unknown): Promise<AccountLimit> {
    const { data } = await validate(createAccountLimitSchema, payload);

    const insertData = {
      ...data,
      limit: data.limit ?? 0,
    } satisfies NewAccountLimit;

    const [limit] = await db.insert(accountLimits).values(insertData).returning();

    return formatAccountLimitModel(limit);
  }

  async updateSingle(id: unknown, payload: unknown): Promise<AccountLimit> {
    const idNum = parseId(id);
    const { data } = await validate(updateAccountLimitSchema, payload);

    const updateData = {
      ...data,
    } satisfies Partial<UpdateAccountLimit>;

    const [limit] = await db.update(accountLimits).set(updateData).where(eq(accountLimits.id, idNum)).returning();

    return formatAccountLimitModel(limit);
  }

  async deleteSingle(id: unknown): Promise<AccountLimit> {
    const idNum = parseId(id);
    const [limit] = await db.delete(accountLimits).where(eq(accountLimits.id, idNum)).returning();

    return formatAccountLimitModel(limit);
  }
}

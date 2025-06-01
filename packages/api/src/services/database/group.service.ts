import { eq, and, asc, desc, SQL } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatGroupModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import { groupQuerySchema, createGroupSchema, updateGroupSchema } from '../../helpers/validation/group.schema.ts';
import { validate } from '../../helpers/validation/index.ts';
import { Group, groups, NewGroup, PagedGroups } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class GroupService implements DatabaseServiceSchema<Group> {
  /**
   * Get many groups with optional filters, sorting, and pagination
   */
  async getMany(filters?: unknown): Promise<PagedGroups> {
    const { data } = await validate(groupQuerySchema, filters ?? {});
    const { id, name, sortBy = 'createdAt', sortOrder = 'asc', pageSize = 25, pageNumber = 1 } = data;

    const conditions: SQL[] = [];
    if (id !== undefined) conditions.push(eq(groups.id, id));
    if (name !== undefined) conditions.push(eq(groups.name, name));

    // Sorting
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'name':
        order = isAscending ? asc(groups.name) : desc(groups.name);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(groups.createdAt) : desc(groups.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(groups)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('GROUP_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(groups)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('GROUP_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatGroupModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } satisfies PagedGroups;
  }

  /**
   * Get a single group by id with optional filters
   */
  async getSingle(filters?: unknown) {
    const { data } = await validate(groupQuerySchema, filters ?? {});

    const { id, name } = data;

    const conditions = [];
    if (id !== undefined) conditions.push(eq(groups.id, id));
    if (name !== undefined) conditions.push(eq(groups.name, name));

    const [group] = await db
      .select()
      .from(groups)
      .where(and(...conditions));
    return formatGroupModel(group);
  }

  /**
   * Create a single group
   */
  async createSingle(payload: unknown) {
    const { data } = await validate(createGroupSchema, payload);

    const insertData = {
      name: data.name,
      defaultCurrency: data.defaultCurrency,
    } satisfies NewGroup;

    const [group] = await db
      .insert(groups)
      .values({
        name: insertData.name,
        defaultCurrency: insertData.defaultCurrency,
      })
      .returning();
    return formatGroupModel(group);
  }

  /**
   * Update a single group by id
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);
    const { data } = await validate(updateGroupSchema, payload);
    const [group] = await db
      .update(groups)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(groups.id, idNum))
      .returning();
    return formatGroupModel(group);
  }

  /**
   * Delete a single group by id
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);
    const [group] = await db.delete(groups).where(eq(groups.id, idNum)).returning();
    return formatGroupModel(group);
  }
}

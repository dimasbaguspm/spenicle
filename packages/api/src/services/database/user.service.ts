import { eq, and, asc, desc, SQL } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatUserModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import { registerSchema } from '../../helpers/validation/auth.schema.ts';
import { updateUserSchema, userQuerySchema, validate } from '../../helpers/validation/index.ts';
import { User, users, PagedUsers } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class UserService implements DatabaseServiceSchema<User> {
  /**
   * Get many users with optional filters, sorting, and pagination
   */
  async getMany(filters?: unknown): Promise<PagedUsers> {
    const { data } = await validate(userQuerySchema, filters ?? {});

    const {
      id,
      groupId,
      email,
      name,
      isActive,
      isOnboard,
      sortBy = 'createdAt',
      sortOrder = 'asc',
      pageSize = 25,
      pageNumber = 1,
    } = data;

    // filtering
    const conditions: SQL[] = [];
    if (id !== undefined) conditions.push(eq(users.id, id));
    if (groupId !== undefined) conditions.push(eq(users.groupId, groupId));
    if (email !== undefined) conditions.push(eq(users.email, email));
    if (name !== undefined) conditions.push(eq(users.name, name));
    if (isActive !== undefined) conditions.push(eq(users.isActive, isActive));
    if (isOnboard !== undefined) conditions.push(eq(users.isOnboard, isOnboard));

    // sorting
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'name':
        order = isAscending ? asc(users.name) : desc(users.name);
        break;
      case 'email':
        order = isAscending ? asc(users.email) : desc(users.email);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(users.createdAt) : desc(users.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('USER_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('USER_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatUserModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } satisfies PagedUsers;
  }

  /**
   * Get a single user by id with optional filters
   */
  async getSingle(filters?: unknown) {
    const { data } = await validate(userQuerySchema, filters ?? {});

    const { groupId, email, name, isActive, isOnboard, id } = data;

    const conditions = [];
    if (id) conditions.push(eq(users.id, id));
    if (groupId) conditions.push(eq(users.groupId, groupId));
    if (email) conditions.push(eq(users.email, email));
    if (name) conditions.push(eq(users.name, name));
    if (isActive) conditions.push(eq(users.isActive, isActive));
    if (isOnboard !== undefined) conditions.push(eq(users.isOnboard, isOnboard));

    const [user] = await db
      .select()
      .from(users)
      .where(and(...conditions));
    return formatUserModel(user);
  }

  /**
   * Create a single user
   */
  async createSingle(payload: unknown) {
    const { data } = await validate(registerSchema, payload);
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.password,
        name: data.name,
        groupId: data.groupId,
        isActive: false,
        isOnboard: false,
      })
      .returning();
    return formatUserModel(user);
  }

  /**
   * Update a single user by id
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);
    const { data } = await validate(updateUserSchema, payload);

    const [user] = await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        isActive: data.isActive,
        isOnboard: data.isOnboard,
      })
      .where(eq(users.id, idNum))
      .returning();
    return formatUserModel(user);
  }

  /**
   * Delete a single user by id
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);
    const [user] = await db.delete(users).where(eq(users.id, idNum)).returning();
    return formatUserModel(user);
  }
}

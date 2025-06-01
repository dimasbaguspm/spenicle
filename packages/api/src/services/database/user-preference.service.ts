import { eq, and, asc, desc, SQL } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatUserPreferenceModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import {
  createUserPreferenceSchema,
  updateUserPreferenceSchema,
  userPreferenceQuerySchema,
  validate,
} from '../../helpers/validation/index.ts';
import { UserPreference, userPreferences, PagedUserPreferences } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class UserPreferenceService implements DatabaseServiceSchema<UserPreference> {
  /**
   * Get many user preferences with optional filters, sorting, and pagination
   */
  async getMany(filters?: unknown): Promise<PagedUserPreferences> {
    const { data } = await validate(userPreferenceQuerySchema, filters ?? {});

    const {
      id,
      userId,
      monthlyStartDate,
      weeklyStartDay,
      limitPeriod,
      categoryPeriod,
      sortBy = 'createdAt',
      sortOrder = 'asc',
      pageSize = 25,
      pageNumber = 1,
    } = data;

    // filtering
    const conditions: SQL[] = [];
    if (id !== undefined) conditions.push(eq(userPreferences.id, id));
    if (userId !== undefined) conditions.push(eq(userPreferences.userId, userId));
    if (monthlyStartDate !== undefined) conditions.push(eq(userPreferences.monthlyStartDate, monthlyStartDate));
    if (weeklyStartDay !== undefined) conditions.push(eq(userPreferences.weeklyStartDay, weeklyStartDay));
    if (limitPeriod !== undefined) conditions.push(eq(userPreferences.limitPeriod, limitPeriod));
    if (categoryPeriod !== undefined) conditions.push(eq(userPreferences.categoryPeriod, categoryPeriod));

    // sorting
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'userId':
        order = isAscending ? asc(userPreferences.userId) : desc(userPreferences.userId);
        break;
      case 'monthlyStartDate':
        order = isAscending ? asc(userPreferences.monthlyStartDate) : desc(userPreferences.monthlyStartDate);
        break;
      case 'weeklyStartDay':
        order = isAscending ? asc(userPreferences.weeklyStartDay) : desc(userPreferences.weeklyStartDay);
        break;
      case 'limitPeriod':
        order = isAscending ? asc(userPreferences.limitPeriod) : desc(userPreferences.limitPeriod);
        break;
      case 'categoryPeriod':
        order = isAscending ? asc(userPreferences.categoryPeriod) : desc(userPreferences.categoryPeriod);
        break;
      case 'updatedAt':
        order = isAscending ? asc(userPreferences.updatedAt) : desc(userPreferences.updatedAt);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(userPreferences.createdAt) : desc(userPreferences.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(userPreferences)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('USER_PREFERENCE_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(userPreferences)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('USER_PREFERENCE_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatUserPreferenceModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } satisfies PagedUserPreferences;
  }

  /**
   * Get a single user preference by id with optional filters
   */
  async getSingle(filters?: unknown) {
    const { data } = await validate(userPreferenceQuerySchema, filters ?? {});

    const { id, userId, monthlyStartDate, weeklyStartDay, limitPeriod, categoryPeriod } = data;

    const conditions = [];
    if (id) conditions.push(eq(userPreferences.id, id));
    if (userId) conditions.push(eq(userPreferences.userId, userId));
    if (monthlyStartDate) conditions.push(eq(userPreferences.monthlyStartDate, monthlyStartDate));
    if (weeklyStartDay) conditions.push(eq(userPreferences.weeklyStartDay, weeklyStartDay));
    if (limitPeriod) conditions.push(eq(userPreferences.limitPeriod, limitPeriod));
    if (categoryPeriod) conditions.push(eq(userPreferences.categoryPeriod, categoryPeriod));

    const [userPreference] = await db
      .select()
      .from(userPreferences)
      .where(and(...conditions));
    return formatUserPreferenceModel(userPreference);
  }

  /**
   * Create a single user preference
   */
  async createSingle(payload: unknown) {
    const { data } = await validate(createUserPreferenceSchema, payload);
    const [userPreference] = await db
      .insert(userPreferences)
      .values({
        userId: data.userId,
        monthlyStartDate: data.monthlyStartDate ?? 25,
        weeklyStartDay: data.weeklyStartDay ?? 1,
        limitPeriod: data.limitPeriod ?? 'monthly',
        categoryPeriod: data.categoryPeriod ?? 'monthly',
      })
      .returning();
    return formatUserPreferenceModel(userPreference);
  }

  /**
   * Update a single user preference by id
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);
    const { data } = await validate(updateUserPreferenceSchema, payload);

    const [userPreference] = await db
      .update(userPreferences)
      .set({
        monthlyStartDate: data.monthlyStartDate,
        weeklyStartDay: data.weeklyStartDay,
        limitPeriod: data.limitPeriod,
        categoryPeriod: data.categoryPeriod,
      })
      .where(eq(userPreferences.id, idNum))
      .returning();
    return formatUserPreferenceModel(userPreference);
  }

  /**
   * Delete a single user preference by id
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);
    const [userPreference] = await db.delete(userPreferences).where(eq(userPreferences.id, idNum)).returning();
    return formatUserPreferenceModel(userPreference);
  }

  /**
   * Get user preferences by user ID
   */
  async getByUserId(userId: number) {
    const [userPreference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return formatUserPreferenceModel(userPreference);
  }

  /**
   * Create default user preferences for a new user
   */
  async createDefault(userId: number) {
    const [userPreference] = await db
      .insert(userPreferences)
      .values({
        userId,
        monthlyStartDate: 25,
        weeklyStartDay: 1, // Monday
        limitPeriod: 'monthly',
        categoryPeriod: 'monthly',
      })
      .returning();
    return formatUserPreferenceModel(userPreference);
  }

  /**
   * Update or create user preferences (upsert)
   */
  async upsert(userId: number, payload: unknown) {
    const existingPreference = await this.getByUserId(userId);

    if (existingPreference) {
      return await this.updateSingle(existingPreference.id, payload);
    } else {
      const { data } = await validate(updateUserPreferenceSchema, payload);
      return await this.createSingle({ userId, ...data });
    }
  }
}

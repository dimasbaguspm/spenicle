import { eq, and, asc, desc, ilike } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatCategoryModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import {
  categoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from '../../helpers/validation/category.schema.ts';
import { validate } from '../../helpers/validation/index.ts';
import { categories, Category, NewCategory, PagedCategories } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class CategoryService implements DatabaseServiceSchema<Category> {
  /**
   * Get many categories with optional filters, sorting, and pagination
   */
  async getMany(filters?: unknown): Promise<PagedCategories> {
    const { data } = await validate(categoryQuerySchema, filters ?? {});
    const { groupId, name, parentId, sortBy = 'createdAt', sortOrder = 'asc', pageSize = 25, pageNumber = 1 } = data;

    const conditions = [];
    if (groupId !== undefined) conditions.push(eq(categories.groupId, groupId));
    if (name !== undefined) conditions.push(ilike(categories.name, `%${name}%`));
    if (parentId !== undefined && parentId !== null) conditions.push(eq(categories.parentId, parentId));

    // Sorting
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'name':
        order = isAscending ? asc(categories.name) : desc(categories.name);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(categories.createdAt) : desc(categories.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(categories)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('CATEGORY_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(categories)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('CATEGORY_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatCategoryModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } satisfies PagedCategories;
  }

  /**
   * Get a single category by id with optional filters
   */
  async getSingle(filters?: unknown) {
    const { data } = await validate(categoryQuerySchema, filters ?? {});

    const { id, groupId, name, parentId } = data;

    const conditions = [];

    if (id) conditions.push(eq(categories.id, id));
    if (groupId) conditions.push(eq(categories.groupId, groupId));
    if (name) conditions.push(ilike(categories.name, `%${name}%`));
    if (parentId) conditions.push(eq(categories.parentId, parentId));

    const [category] = await db
      .select()
      .from(categories)
      .where(and(...conditions));

    return formatCategoryModel(category);
  }

  /**
   * Create a single category
   */
  async createSingle(payload: unknown) {
    const { data } = await validate(createCategorySchema, payload);

    const currentCategory = {
      groupId: data.groupId,
      name: data.name,
      parentId: data.parentId ?? null,
      metadata: data.metadata ?? null,
      note: data.note ?? null,
    } satisfies NewCategory;

    const [category] = await db.insert(categories).values(currentCategory).returning();
    return formatCategoryModel(category);
  }

  /**
   * Update a single category by id
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);
    const { data } = await validate(updateCategorySchema, payload);

    const [category] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(categories.id, idNum))
      .returning();
    return formatCategoryModel(category);
  }

  /**
   * Delete a single category by id
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);
    const [category] = await db.delete(categories).where(eq(categories.id, idNum)).returning();
    return formatCategoryModel(category);
  }
}

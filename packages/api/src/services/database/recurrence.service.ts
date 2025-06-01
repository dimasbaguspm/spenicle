import { SQL, and, asc, desc, eq, gte, lte } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { formatRecurrenceModel } from '../../helpers/model-formatters/index.ts';
import { parseId } from '../../helpers/parsers/index.ts';
import { validate } from '../../helpers/validation/index.ts';
import {
  recurrenceQuerySchema,
  createRecurrenceSchema,
  updateRecurrenceSchema,
} from '../../helpers/validation/recurrence.schema.ts';
import { PagedRecurrences, Recurrence, recurrences } from '../../models/schema.ts';
import { DatabaseServiceSchema } from '../../types/index.ts';

export class RecurrenceService implements DatabaseServiceSchema<Recurrence> {
  /**
   * Get many recurrences with optional filters, sorting, and pagination
   */
  async getMany(filters?: unknown): Promise<PagedRecurrences> {
    const { data } = await validate(recurrenceQuerySchema, filters ?? {});
    const {
      frequency,
      startDate,
      endDate,
      sortBy = 'nextOccurrenceDate',
      sortOrder = 'asc',
      pageSize = 25,
      pageNumber = 1,
    } = data;

    const conditions: SQL[] = [];
    if (frequency !== undefined) conditions.push(eq(recurrences.frequency, frequency));
    if (startDate !== undefined) conditions.push(gte(recurrences.nextOccurrenceDate, startDate));
    if (endDate !== undefined) conditions.push(lte(recurrences.endDate, endDate));

    // Sorting
    const isAscending = sortOrder === 'asc';
    let order;
    switch (sortBy) {
      case 'frequency':
        order = isAscending ? asc(recurrences.frequency) : desc(recurrences.frequency);
        break;
      case 'interval':
        order = isAscending ? asc(recurrences.interval) : desc(recurrences.interval);
        break;
      case 'nextOccurrenceDate':
        order = isAscending ? asc(recurrences.nextOccurrenceDate) : desc(recurrences.nextOccurrenceDate);
        break;
      case 'createdAt':
      default:
        order = isAscending ? asc(recurrences.createdAt) : desc(recurrences.createdAt);
        break;
    }

    const pagedQuery = db
      .select()
      .from(recurrences)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(order)
      .limit(pageSize)
      .offset((pageNumber - 1) * pageSize)
      .prepare('RECURRENCE_PAGED_QUERY');

    const totalQuery = db
      .select()
      .from(recurrences)
      .where(conditions.length ? and(...conditions) : undefined)
      .prepare('RECURRENCE_TOTAL_QUERY');

    const [pagedData, totalData] = await Promise.all([pagedQuery.execute(), totalQuery.execute()]);

    return {
      items: pagedData.map(formatRecurrenceModel),
      pageSize: pageSize,
      pageNumber: pageNumber,
      totalItems: totalData.length,
      totalPages: Math.ceil(totalData.length / pageSize),
    } satisfies PagedRecurrences;
  }

  /**
   * Get a single recurrence by id with optional filters
   */
  async getSingle(filters?: unknown) {
    const { data } = await validate(recurrenceQuerySchema, filters ?? {});

    const { frequency, startDate, endDate, id } = data;

    const conditions: SQL[] = [];
    if (id !== undefined) conditions.push(eq(recurrences.id, id));
    if (frequency !== undefined) conditions.push(eq(recurrences.frequency, frequency));
    if (startDate !== undefined) conditions.push(gte(recurrences.nextOccurrenceDate, startDate));
    if (endDate !== undefined) conditions.push(lte(recurrences.endDate, endDate));

    const [recurrence] = await db
      .select()
      .from(recurrences)
      .where(and(...conditions));
    return formatRecurrenceModel(recurrence);
  }

  /**
   * Create a single recurrence
   */
  async createSingle(payload: unknown) {
    const { data } = await validate(createRecurrenceSchema, payload);
    const [recurrence] = await db
      .insert(recurrences)
      .values({
        frequency: data.frequency,
        interval: data.interval,
        endDate: data.endDate,
        nextOccurrenceDate: data.nextOccurrenceDate,
      })
      .returning();
    return formatRecurrenceModel(recurrence);
  }

  /**
   * Update a single recurrence by id
   */
  async updateSingle(id: unknown, payload: unknown) {
    const idNum = parseId(id);
    const { data } = await validate(updateRecurrenceSchema, payload);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const [recurrence] = await db.update(recurrences).set(updateData).where(eq(recurrences.id, idNum)).returning();
    return formatRecurrenceModel(recurrence);
  }

  /**
   * Delete a single recurrence by id
   */
  async deleteSingle(id: unknown) {
    const idNum = parseId(id);
    const [recurrence] = await db.delete(recurrences).where(eq(recurrences.id, idNum)).returning();
    return formatRecurrenceModel(recurrence);
  }
}

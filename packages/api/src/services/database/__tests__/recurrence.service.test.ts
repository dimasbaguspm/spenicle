// Mock drizzle-orm functions
import { eq, and, asc, desc, gte, lte } from 'drizzle-orm';
import { Mock, Mocked, MockInstance, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { recurrences, Recurrence, PagedRecurrences } from '../../../models/schema.ts';
import { RecurrenceService } from '../recurrence.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

// Mock database configuration
vi.mock('../../../core/db/config.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock validation functions
vi.mock('../../../helpers/validation/index.ts', () => ({
  validate: vi.fn(),
}));

// Get the mocked functions with proper typing
const mockEq = eq as Mock;
const mockAnd = and as Mock;
const mockAsc = asc as Mock;
const mockDesc = desc as Mock;
const mockGte = gte as Mock;
const mockLte = lte as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('RecurrenceService', () => {
  let recurrenceService: RecurrenceService;
  let mockDate: MockInstance;

  const mockRecurrence: Recurrence = {
    id: 1,
    frequency: 'monthly',
    interval: 1,
    nextOccurrenceDate: '2024-06-01T12:00:00.000Z',
    endDate: '2024-06-01T12:00:00.000Z',
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  };

  const mockPagedRecurrences: PagedRecurrences = {
    items: [mockRecurrence],
    pageSize: 25,
    pageNumber: 1,
    totalItems: 1,
    totalPages: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockRecurrence]),
  });

  const mockSelectMany = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        prepare: mockPrepare,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              prepare: mockPrepare,
            }),
          }),
        }),
      }),
    }),
  });

  beforeEach(() => {
    recurrenceService = new RecurrenceService();
    mockDate = vi.spyOn(Date.prototype, 'toISOString');
    mockDate.mockReturnValue('2024-06-01T12:00:00.000Z');
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('getMany', () => {
    it('should get recurrences with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'nextOccurrenceDate', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await recurrenceService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(recurrences.nextOccurrenceDate);
      expect(result).toEqual(mockPagedRecurrences);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        frequency: 'weekly',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        sortBy: 'frequency',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await recurrenceService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(recurrences.frequency, 'weekly');
      expect(mockGte).toHaveBeenCalledWith(recurrences.nextOccurrenceDate, '2024-01-01');
      expect(mockLte).toHaveBeenCalledWith(recurrences.endDate, '2024-12-31');
      expect(mockDesc).toHaveBeenCalledWith(recurrences.frequency);
      expect(result).toEqual({ ...mockPagedRecurrences, pageSize: 10, pageNumber: 2 });
    });

    it('should handle sorting by interval', async () => {
      const filters = { sortBy: 'interval', sortOrder: 'asc' };

      mockValidate.mockResolvedValue({ data: { ...filters, pageSize: 25, pageNumber: 1 } });

      mockDb.select.mockReturnValue(mockSelectMany());

      await recurrenceService.getMany(filters);

      expect(mockAsc).toHaveBeenCalledWith(recurrences.interval);
    });

    it('should handle sorting by createdAt as default', async () => {
      const filters = { sortBy: 'createdAt', sortOrder: 'desc' };

      mockValidate.mockResolvedValue({ data: { ...filters, pageSize: 25, pageNumber: 1 } });

      mockDb.select.mockReturnValue(mockSelectMany());

      await recurrenceService.getMany(filters);

      expect(mockDesc).toHaveBeenCalledWith(recurrences.createdAt);
    });
  });

  describe('getSingle', () => {
    it('should get a single recurrence by conditions', async () => {
      const filters = { id: 1, frequency: 'monthly' };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRecurrence]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await recurrenceService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(recurrences.id, 1);
      expect(mockEq).toHaveBeenCalledWith(recurrences.frequency, 'monthly');
      expect(mockAnd).toHaveBeenCalled();
      expect(result).toEqual(mockRecurrence);
    });

    it('should return undefined when no recurrence found', async () => {
      const filters = { id: 999 };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await recurrenceService.getSingle(filters);

      expect(result).toBeUndefined();
    });

    it('should filter by date ranges', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRecurrence]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      await recurrenceService.getSingle(filters);

      expect(mockGte).toHaveBeenCalledWith(recurrences.nextOccurrenceDate, '2024-01-01');
      expect(mockLte).toHaveBeenCalledWith(recurrences.endDate, '2024-12-31');
    });
  });

  describe('createSingle', () => {
    it('should create a new recurrence', async () => {
      const recurrenceData = {
        frequency: 'weekly',
        interval: 2,
        nextOccurrenceDate: '2024-06-15',
        endDate: '2024-12-31',
      };

      mockValidate.mockResolvedValue({ data: recurrenceData });
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRecurrence]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await recurrenceService.createSingle(recurrenceData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), recurrenceData);
      expect(mockDb.insert).toHaveBeenCalledWith(recurrences);

      const insertCall = mockInsert().values as Mock;
      expect(insertCall).toHaveBeenCalledWith({
        frequency: recurrenceData.frequency,
        interval: recurrenceData.interval,
        endDate: recurrenceData.endDate,
        nextOccurrenceDate: recurrenceData.nextOccurrenceDate,
      });

      expect(result).toEqual(mockRecurrence);
    });

    it('should create a recurrence without endDate', async () => {
      const recurrenceData = {
        frequency: 'daily',
        interval: 1,
        nextOccurrenceDate: '2024-06-02',
      };

      mockValidate.mockResolvedValue({ data: recurrenceData });
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRecurrence]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      await recurrenceService.createSingle(recurrenceData);

      const insertCall = mockInsert().values as Mock;
      expect(insertCall).toHaveBeenCalledWith({
        frequency: recurrenceData.frequency,
        interval: recurrenceData.interval,
        endDate: undefined,
        nextOccurrenceDate: recurrenceData.nextOccurrenceDate,
      });
    });
  });

  describe('updateSingle', () => {
    it('should update a recurrence by id with timestamp', async () => {
      const id = 1;
      const updateData = {
        frequency: 'yearly',
        interval: 3,
        nextOccurrenceDate: '2024-06-01T12:00:00.000Z',
      };

      mockValidate.mockResolvedValue({ data: updateData });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockRecurrence, ...updateData }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await recurrenceService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.update).toHaveBeenCalledWith(recurrences);
      expect(mockEq).toHaveBeenCalledWith(recurrences.id, id);

      // Verify that updatedAt timestamp is added
      const setCall = mockUpdate().set as Mock;
      expect(setCall).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: '2024-06-01T12:00:00.000Z',
      });

      expect(result).toEqual({ ...mockRecurrence, ...updateData });
    });
  });

  describe('deleteSingle', () => {
    it('should delete a recurrence by id', async () => {
      const id = 1;

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRecurrence]),
        }),
      });
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await recurrenceService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(recurrences);
      expect(mockEq).toHaveBeenCalledWith(recurrences.id, id);
      expect(result).toEqual(mockRecurrence);
    });
  });
});

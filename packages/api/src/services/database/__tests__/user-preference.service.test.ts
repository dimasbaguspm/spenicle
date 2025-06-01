// Mock drizzle-orm functions
import { eq, and, asc, desc } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { userPreferences, UserPreference, PagedUserPreferences } from '../../../models/schema.ts';
import { UserPreferenceService } from '../user-preference.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
}));

vi.mock('../../../core/db/config.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../helpers/validation/index.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../helpers/validation/index.ts')>();
  return {
    ...actual,
    validate: vi.fn(),
  };
});

vi.mock('../../../helpers/parsers/index.ts', () => ({
  parseId: vi.fn((id) => Number(id)),
}));

// Get the mocked functions with proper typing
const mockEq = eq as Mock;
const mockAnd = and as Mock;
const mockAsc = asc as Mock;
const mockDesc = desc as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('UserPreferenceService', () => {
  let userPreferenceService: UserPreferenceService;

  const mockUserPreference: UserPreference = {
    id: 1,
    userId: 1,
    monthlyStartDate: 25,
    weeklyStartDay: 1,
    limitPeriod: 'monthly',
    categoryPeriod: 'monthly',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPagedUserPreferences: PagedUserPreferences = {
    items: [mockUserPreference],
    totalItems: 1,
    totalPages: 1,
    pageSize: 25,
    pageNumber: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockUserPreference]),
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

  const mockSelectSingle = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([mockUserPreference]),
    }),
  });

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockUserPreference]),
    }),
  });

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUserPreference]),
      }),
    }),
  });

  const mockDelete = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockUserPreference]),
    }),
  });

  beforeEach(() => {
    userPreferenceService = new UserPreferenceService();
    vi.clearAllMocks();
  });

  describe('getMany', () => {
    it('should return paginated user preferences with default filters', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });
      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await userPreferenceService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(userPreferences.createdAt);
      expect(result).toEqual(mockPagedUserPreferences);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        userId: 1,
        monthlyStartDate: 25,
        weeklyStartDay: 1,
        limitPeriod: 'monthly',
        categoryPeriod: 'monthly',
        sortBy: 'createdAt',
        sortOrder: 'asc',
        pageSize: 25,
        pageNumber: 1,
      };

      mockValidate.mockResolvedValue({ data: filters });
      mockDb.select.mockReturnValue(mockSelectMany());

      await userPreferenceService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.userId, 1);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.monthlyStartDate, 25);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.weeklyStartDay, 1);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.limitPeriod, 'monthly');
      expect(mockEq).toHaveBeenCalledWith(userPreferences.categoryPeriod, 'monthly');
    });

    it('should handle sorting by userId in ascending order', async () => {
      const mockFilters = { sortBy: 'userId', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });
      mockDb.select.mockReturnValue(mockSelectMany());

      await userPreferenceService.getMany();

      expect(mockAsc).toHaveBeenCalledWith(userPreferences.userId);
    });

    it('should handle sorting by userId in descending order', async () => {
      const mockFilters = { sortBy: 'userId', sortOrder: 'desc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });
      mockDb.select.mockReturnValue(mockSelectMany());

      await userPreferenceService.getMany();

      expect(mockDesc).toHaveBeenCalledWith(userPreferences.userId);
    });

    it('should handle sorting by monthlyStartDate', async () => {
      const mockFilters = { sortBy: 'monthlyStartDate', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });
      mockDb.select.mockReturnValue(mockSelectMany());

      await userPreferenceService.getMany();

      expect(mockAsc).toHaveBeenCalledWith(userPreferences.monthlyStartDate);
    });

    it('should handle pagination correctly', async () => {
      const mockFilters = { pageSize: 10, pageNumber: 3, sortBy: 'createdAt', sortOrder: 'asc' };

      mockValidate.mockResolvedValue({ data: mockFilters });
      mockDb.select.mockReturnValue(mockSelectMany());

      await userPreferenceService.getMany();

      // The mocks will be called through the chain
      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
    });
  });

  describe('getSingle', () => {
    it('should return a single user preference by id', async () => {
      const filters = { id: 1 };
      mockValidate.mockResolvedValue({ data: filters });
      mockDb.select.mockReturnValue(mockSelectSingle());

      const result = await userPreferenceService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.id, 1);
      expect(result).toEqual(mockUserPreference);
    });

    it('should return a single user preference by userId', async () => {
      const filters = { userId: 1 };
      mockValidate.mockResolvedValue({ data: filters });
      mockDb.select.mockReturnValue(mockSelectSingle());

      const result = await userPreferenceService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.userId, 1);
      expect(result).toEqual(mockUserPreference);
    });

    it('should handle multiple filters', async () => {
      const filters = { userId: 1, monthlyStartDate: 25 };
      mockValidate.mockResolvedValue({ data: filters });
      mockDb.select.mockReturnValue(mockSelectSingle());

      await userPreferenceService.getSingle(filters);

      expect(mockEq).toHaveBeenCalledWith(userPreferences.userId, 1);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.monthlyStartDate, 25);
      expect(mockAnd).toHaveBeenCalled();
    });
  });

  describe('createSingle', () => {
    it('should create a user preference with provided values', async () => {
      const payload = {
        userId: 1,
        monthlyStartDate: 15,
        weeklyStartDay: 0,
        limitPeriod: 'weekly',
        categoryPeriod: 'annually',
      };
      mockValidate.mockResolvedValue({ data: payload });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await userPreferenceService.createSingle(payload);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), payload);
      expect(mockDb.insert).toHaveBeenCalledWith(userPreferences);
      expect(result).toEqual(mockUserPreference);
    });

    it('should create a user preference with default values when not provided', async () => {
      const payload = { userId: 1 };
      mockValidate.mockResolvedValue({ data: payload });
      mockDb.insert.mockReturnValue(mockInsert());

      await userPreferenceService.createSingle(payload);

      expect(mockDb.insert).toHaveBeenCalledWith(userPreferences);
    });
  });

  describe('updateSingle', () => {
    it('should update a user preference', async () => {
      const id = 1;
      const payload = {
        monthlyStartDate: 20,
        weeklyStartDay: 3,
        limitPeriod: 'weekly',
        categoryPeriod: 'annually',
      };
      mockValidate.mockResolvedValue({ data: payload });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await userPreferenceService.updateSingle(id, payload);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), payload);
      expect(mockDb.update).toHaveBeenCalledWith(userPreferences);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.id, 1);
      expect(result).toEqual(mockUserPreference);
    });

    it('should handle partial updates', async () => {
      const id = 1;
      const payload = { monthlyStartDate: 15 };
      mockValidate.mockResolvedValue({ data: payload });
      mockDb.update.mockReturnValue(mockUpdate());

      await userPreferenceService.updateSingle(id, payload);

      expect(mockDb.update).toHaveBeenCalledWith(userPreferences);
    });
  });

  describe('deleteSingle', () => {
    it('should delete a user preference', async () => {
      const id = 1;
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await userPreferenceService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(userPreferences);
      expect(mockEq).toHaveBeenCalledWith(userPreferences.id, 1);
      expect(result).toEqual(mockUserPreference);
    });
  });

  describe('getByUserId', () => {
    it('should get user preference by userId', async () => {
      const userId = 1;
      mockDb.select.mockReturnValue(mockSelectSingle());

      const result = await userPreferenceService.getByUserId(userId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(userPreferences.userId, userId);
      expect(result).toEqual(mockUserPreference);
    });
  });

  describe('createDefault', () => {
    it('should create default user preferences', async () => {
      const userId = 1;
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await userPreferenceService.createDefault(userId);

      expect(mockDb.insert).toHaveBeenCalledWith(userPreferences);
      expect(result).toEqual(mockUserPreference);
    });
  });

  describe('upsert', () => {
    it('should update existing preference', async () => {
      const userId = 1;
      const payload = { monthlyStartDate: 20 };

      // Mock getByUserId to return existing preference
      const mockGetByUserId = vi.spyOn(userPreferenceService, 'getByUserId').mockResolvedValue(mockUserPreference);
      const mockUpdateSingle = vi.spyOn(userPreferenceService, 'updateSingle').mockResolvedValue(mockUserPreference);

      const result = await userPreferenceService.upsert(userId, payload);

      expect(mockGetByUserId).toHaveBeenCalledWith(userId);
      expect(mockUpdateSingle).toHaveBeenCalledWith(mockUserPreference.id, payload);
      expect(result).toEqual(mockUserPreference);
    });

    it('should create new preference when none exists', async () => {
      const userId = 1;
      const payload = { monthlyStartDate: 20 };

      // Mock getByUserId to return null (no existing preference)
      const mockGetByUserId = vi.spyOn(userPreferenceService, 'getByUserId').mockResolvedValue(null as any);
      const mockCreateSingle = vi.spyOn(userPreferenceService, 'createSingle').mockResolvedValue(mockUserPreference);
      mockValidate.mockResolvedValue({ data: payload });

      const result = await userPreferenceService.upsert(userId, payload);

      expect(mockGetByUserId).toHaveBeenCalledWith(userId);
      expect(mockCreateSingle).toHaveBeenCalledWith({ userId, ...payload });
      expect(result).toEqual(mockUserPreference);
    });
  });
});

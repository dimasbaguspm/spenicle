import { eq, asc, desc } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { AccountLimit, accountLimits, PagedAccountLimits } from '../../../models/schema.ts';
import { AccountLimitService } from '../account-limit.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  ilike: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}));

// Mock database configuration
vi.mock('../../../core/db/config.ts', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock validation
vi.mock('../../../helpers/validation/index.ts', () => ({
  validate: vi.fn(),
}));

// Get the mocked functions with proper typing
const mockEq = eq as Mock;
const mockAsc = asc as Mock;
const mockDesc = desc as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('AccountLimitService', () => {
  let accountLimitService: AccountLimitService;

  const mockAccountLimit: AccountLimit = {
    id: 1,
    accountId: 1,
    period: 'month',
    limit: 5000,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPagedAccountLimits: PagedAccountLimits = {
    items: [mockAccountLimit],
    totalItems: 1,
    totalPages: 1,
    pageSize: 25,
    pageNumber: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockAccountLimit]),
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
    accountLimitService = new AccountLimitService();
    vi.clearAllMocks();
  });

  describe('getMany', () => {
    it('should get account limits with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await accountLimitService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalledWith();
      expect(result).toEqual(mockPagedAccountLimits);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        id: 1,
        accountId: 1,
        period: 'month',
        sortBy: 'period',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const results = await accountLimitService.getMany(filters);

      expect(mockEq).toHaveBeenCalledWith(accountLimits.id, 1);
      expect(mockEq).toHaveBeenCalledWith(accountLimits.accountId, 1);
      expect(mockEq).toHaveBeenCalledWith(accountLimits.period, 'month');
      expect(mockDesc).toHaveBeenCalledWith(accountLimits.period);
      expect(results).toEqual({ ...mockPagedAccountLimits, pageSize: 10, pageNumber: 2 });
    });

    it('should handle different sort orders', async () => {
      const filters = { sortBy: 'limit', sortOrder: 'asc' };

      mockValidate.mockResolvedValue({ data: { ...filters, pageSize: 25, pageNumber: 1 } });

      mockDb.select.mockReturnValue(mockSelectMany());

      await accountLimitService.getMany(filters);

      expect(mockAsc).toHaveBeenCalledWith(accountLimits.limit);
    });

    it('should handle custom sorting by date fields', async () => {
      const filters = { sortBy: 'createdAt', sortOrder: 'desc' };

      mockValidate.mockResolvedValue({ data: { ...filters, pageSize: 25, pageNumber: 1 } });

      mockDb.select.mockReturnValue(mockSelectMany());

      await accountLimitService.getMany(filters);

      expect(mockDesc).toHaveBeenCalledWith(accountLimits.createdAt);
    });
  });

  describe('getSingle', () => {
    it('should get a single account limit', async () => {
      const filters = { id: 1 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockAccountLimit]),
        }),
      });

      mockDb.select.mockReturnValue(mockSelect());

      const result = await accountLimitService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(result).toEqual(mockAccountLimit);
    });

    it('should return undefined when account limit not found', async () => {
      const filters = { accountId: 999 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.select.mockReturnValue(mockSelect());

      const result = await accountLimitService.getSingle(filters);

      expect(result).toBeUndefined();
    });

    it('should apply filters correctly in getSingle', async () => {
      const filters = { accountId: 1, period: 'week' };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockAccountLimit]),
        }),
      });

      mockDb.select.mockReturnValue(mockSelect());

      await accountLimitService.getSingle(filters);

      expect(mockEq).toHaveBeenCalledWith(accountLimits.accountId, 1);
      expect(mockEq).toHaveBeenCalledWith(accountLimits.period, 'week');
    });
  });

  describe('createSingle', () => {
    it('should create a new account limit', async () => {
      const accountLimitData = {
        accountId: 1,
        period: 'week' as const,
        limit: 1000,
      };

      mockValidate.mockResolvedValue({ data: accountLimitData });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAccountLimit]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await accountLimitService.createSingle(accountLimitData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), accountLimitData);
      expect(mockDb.insert).toHaveBeenCalledWith(accountLimits);

      const insertCall = mockDb.insert(accountLimits);
      const valuesCall = insertCall.values as Mock;
      expect(valuesCall).toHaveBeenCalledWith(accountLimitData);

      expect(result).toEqual(mockAccountLimit);
    });
  });

  describe('updateSingle', () => {
    it('should update an account limit', async () => {
      const id = 1;
      const updateData = { limit: 2000 };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockAccountLimit, ...updateData }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await accountLimitService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.update).toHaveBeenCalledWith(accountLimits);
      expect(mockEq).toHaveBeenCalledWith(accountLimits.id, 1);
      expect(result).toEqual({ ...mockAccountLimit, ...updateData });
    });
  });

  describe('deleteSingle', () => {
    it('should delete an account limit', async () => {
      const id = 1;

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAccountLimit]),
        }),
      });
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await accountLimitService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(accountLimits);
      expect(mockEq).toHaveBeenCalledWith(accountLimits.id, 1);
      expect(result).toEqual(mockAccountLimit);
    });
  });
});

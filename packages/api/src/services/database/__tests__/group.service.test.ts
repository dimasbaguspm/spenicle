// Mock drizzle-orm functions
import { eq, and, asc, desc } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { groups, Group, PagedGroups } from '../../../models/schema.ts';
import { GroupService } from '../group.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
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
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('GroupService', () => {
  let groupService: GroupService;

  const mockGroup: Group = {
    id: 1,
    name: 'Test Group',
    defaultCurrency: 'USD',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPagedGroups: PagedGroups = {
    items: [mockGroup],
    totalItems: 1,
    totalPages: 1,
    pageSize: 25,
    pageNumber: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockGroup]),
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
    groupService = new GroupService();
    vi.clearAllMocks();
  });

  describe('getMany', () => {
    it('should get groups with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await groupService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(groups.createdAt);
      expect(result).toEqual(mockPagedGroups);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        id: 1,
        name: 'Test Group',
        sortBy: 'name',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await groupService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(groups.id, 1);
      expect(mockEq).toHaveBeenCalledWith(groups.name, 'Test Group');
      expect(mockDesc).toHaveBeenCalledWith(groups.name);
      expect(result).toEqual({ ...mockPagedGroups, pageSize: 10, pageNumber: 2 });
    });
  });

  describe('getSingle', () => {
    it('should get a single group by conditions', async () => {
      const filters = { id: 1 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockGroup]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await groupService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(groups.id, 1);
      expect(mockAnd).toHaveBeenCalled();
      expect(result).toEqual(mockGroup);
    });

    it('should return undefined when no group found', async () => {
      const filters = { id: 999 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await groupService.getSingle(filters);

      expect(result).toBeUndefined();
    });
  });

  describe('createSingle', () => {
    it('should create a new group', async () => {
      const groupData = {
        name: 'New Group',
        defaultCurrency: 'EUR',
      };

      mockValidate.mockResolvedValue({ data: groupData });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGroup]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await groupService.createSingle(groupData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), groupData);
      expect(mockDb.insert).toHaveBeenCalledWith(groups);
      expect(mockInsert().values).toHaveBeenCalledWith(groupData);
      expect(result).toEqual(mockGroup);
    });
  });

  describe('updateSingle', () => {
    it('should update a group by id', async () => {
      const id = 1;
      const updateData = {
        name: 'Updated Group',
        defaultCurrency: 'GBP',
      };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockGroup, ...updateData }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await groupService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.update).toHaveBeenCalledWith(groups);
      expect(mockUpdate().set).toHaveBeenCalledWith({ ...updateData, updatedAt: expect.any(String) });
      expect(mockEq).toHaveBeenCalledWith(groups.id, id);
      expect(result).toEqual({ ...mockGroup, ...updateData });
    });
  });

  describe('deleteSingle', () => {
    it('should delete a group by id', async () => {
      const id = 1;

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGroup]),
        }),
      });
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await groupService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(groups);
      expect(mockEq).toHaveBeenCalledWith(groups.id, id);
      expect(result).toEqual(mockGroup);
    });
  });
});

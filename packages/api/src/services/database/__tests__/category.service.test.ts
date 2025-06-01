// Mock drizzle-orm functions
import { eq, and, asc, desc, ilike } from 'drizzle-orm';
import { Mock, Mocked, MockInstance, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { categories, Category, PagedCategories } from '../../../models/schema.ts';
import { CategoryService } from '../category.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  ilike: vi.fn(),
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
const mockIlike = ilike as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockDate: MockInstance;

  const mockCategory: Category = {
    id: 1,
    groupId: 1,
    parentId: null,
    metadata: null,
    name: 'Test Category',
    note: 'Test category note',
    createdAt: '2024-06-01T12:00:00.000Z',
    updatedAt: '2024-06-01T12:00:00.000Z',
  };

  const mockPagedCategories: PagedCategories = {
    items: [mockCategory],
    totalItems: 1,
    totalPages: 1,
    pageSize: 25,
    pageNumber: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockCategory]),
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
    categoryService = new CategoryService();
    mockDate = vi.spyOn(Date.prototype, 'toISOString');
    mockDate.mockReturnValue('2024-06-01T12:00:00.000Z');
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('getMany', () => {
    it('should get categories with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await categoryService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(categories.createdAt);
      expect(result).toEqual(mockPagedCategories);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        groupId: 1,
        name: 'Test',
        parentId: 2,
        sortBy: 'name',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await categoryService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(categories.groupId, 1);
      expect(mockIlike).toHaveBeenCalledWith(categories.name, '%Test%');
      expect(mockEq).toHaveBeenCalledWith(categories.parentId, 2);
      expect(mockDesc).toHaveBeenCalledWith(categories.name);
      expect(result).toEqual({ ...mockPagedCategories, pageSize: 10, pageNumber: 2 });
    });

    it('should handle null parentId filter', async () => {
      const filters = { groupId: 1, parentId: null };

      mockValidate.mockResolvedValue({
        data: { ...filters, sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await categoryService.getMany(filters);

      expect(mockEq).toHaveBeenCalledWith(categories.groupId, 1);
      // parentId: null should not create a condition
    });
  });

  describe('getSingle', () => {
    it('should get a single category by conditions', async () => {
      const filters = { id: 1, groupId: 1 };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCategory]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await categoryService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(categories.id, 1);
      expect(mockEq).toHaveBeenCalledWith(categories.groupId, 1);
      expect(mockAnd).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });

    it('should return undefined when no category found', async () => {
      const filters = { id: 999 };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await categoryService.getSingle(filters);

      expect(result).toBeUndefined();
    });
  });

  describe('createSingle', () => {
    it('should create a new category', async () => {
      const categoryData = {
        groupId: 1,
        name: 'New Category',
        parentId: 2,
        note: 'New category note',
      };

      mockValidate.mockResolvedValue({ data: categoryData });
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCategory]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await categoryService.createSingle(categoryData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), categoryData);
      expect(mockDb.insert).toHaveBeenCalledWith(categories);
      expect(result).toEqual(mockCategory);
    });
  });

  describe('updateSingle', () => {
    it('should update a category by id with timestamp', async () => {
      const id = 1;
      const updateData = {
        name: 'Updated Category',
        parentId: 3,
        note: 'Updated note',
      };

      mockValidate.mockResolvedValue({ data: updateData });
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockCategory, ...updateData }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await categoryService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.update).toHaveBeenCalledWith(categories);
      expect(mockEq).toHaveBeenCalledWith(categories.id, id);

      // Verify that updatedAt timestamp is added
      const setCall = mockUpdate().set as Mock;
      expect(setCall).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: '2024-06-01T12:00:00.000Z',
      });

      expect(result).toEqual({ ...mockCategory, ...updateData });
    });
  });

  describe('deleteSingle', () => {
    it('should delete a category by id', async () => {
      const id = 1;

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCategory]),
        }),
      });
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await categoryService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(categories);
      expect(mockEq).toHaveBeenCalledWith(categories.id, id);
      expect(result).toEqual(mockCategory);
    });
  });
});

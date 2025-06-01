// Mock drizzle-orm functions
import { eq, and, asc, desc, ilike } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { accounts, Account, PagedAccounts } from '../../../models/schema.ts';
import { AccountService } from '../account.service.ts';

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

describe('AccountService', () => {
  let accountService: AccountService;

  const mockAccount: Account = {
    id: 1,
    groupId: 1,
    name: 'Test Account',
    type: 'checking',
    metadata: null,
    note: 'Test account note',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPagedAccounts: PagedAccounts = {
    items: [mockAccount],
    totalItems: 1,
    totalPages: 1,
    pageSize: 25,
    pageNumber: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockAccount]),
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
    accountService = new AccountService();
    vi.clearAllMocks();
  });

  describe('getMany', () => {
    it('should get accounts with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await accountService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(accounts.createdAt);
      expect(result).toEqual(mockPagedAccounts);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        id: 1,
        groupId: 1,
        name: 'Test',
        type: 'checking',
        sortBy: 'name',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await accountService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(accounts.id, 1);
      expect(mockEq).toHaveBeenCalledWith(accounts.groupId, 1);
      expect(mockIlike).toHaveBeenCalledWith(accounts.name, '%Test%');
      expect(mockEq).toHaveBeenCalledWith(accounts.type, 'checking');
      expect(mockDesc).toHaveBeenCalledWith(accounts.name);
      expect(result).toEqual({ ...mockPagedAccounts, pageSize: 10, pageNumber: 2 });
    });

    it('should handle sorting by type', async () => {
      const filters = { sortBy: 'type', sortOrder: 'asc' };

      mockValidate.mockResolvedValue({ data: { ...filters, pageSize: 25, pageNumber: 1 } });

      mockDb.select.mockReturnValue(mockSelectMany());

      await accountService.getMany(filters);

      expect(mockAsc).toHaveBeenCalledWith(accounts.type);
    });
  });

  describe('getSingle', () => {
    it('should get a single account by conditions', async () => {
      const filters = { id: 1, groupId: 1 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockAccount]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await accountService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(accounts.id, 1);
      expect(mockEq).toHaveBeenCalledWith(accounts.groupId, 1);
      expect(mockAnd).toHaveBeenCalled();
      expect(result).toEqual(mockAccount);
    });

    it('should return undefined when no account found', async () => {
      const filters = { id: 999 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await accountService.getSingle(filters);

      expect(result).toBeUndefined();
    });
  });

  describe('createSingle', () => {
    it('should create a new account', async () => {
      const accountData = {
        groupId: 1,
        name: 'New Account',
        type: 'savings',
        limit: 2000,
        note: 'New account note',
      };

      mockValidate.mockResolvedValue({ data: accountData });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAccount]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await accountService.createSingle(accountData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), accountData);
      expect(mockDb.insert).toHaveBeenCalledWith(accounts);
      expect(result).toEqual(mockAccount);
    });
  });

  describe('updateSingle', () => {
    it('should update an account by id', async () => {
      const id = 1;
      const updateData = {
        name: 'Updated Account',
        type: 'credit',
        limit: 3000,
      };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockAccount, ...updateData }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await accountService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.update).toHaveBeenCalledWith(accounts);
      expect(mockEq).toHaveBeenCalledWith(accounts.id, id);
      expect(result).toEqual({ ...mockAccount, ...updateData });
    });
  });

  describe('deleteSingle', () => {
    it('should delete an account by id', async () => {
      const id = 1;

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAccount]),
        }),
      });
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await accountService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(accounts);
      expect(mockEq).toHaveBeenCalledWith(accounts.id, id);
      expect(result).toEqual(mockAccount);
    });
  });
});

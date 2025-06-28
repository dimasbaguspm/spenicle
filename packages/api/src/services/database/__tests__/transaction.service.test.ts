// Mock drizzle-orm functions
import { eq, and, asc, desc, gte, lte, ilike, inArray } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { transactions, Transaction, PagedTransactions } from '../../../models/schema.ts';
import { TransactionService } from '../transaction.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  ilike: vi.fn(),
  inArray: vi.fn(),
}));

// Mock database configuration
vi.mock('../../../core/db/config.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
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
const mockIlike = ilike as Mock;
const mockInArray = inArray as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('TransactionService', () => {
  let transactionService: TransactionService;

  const mockTransaction: Transaction = {
    id: 1,
    groupId: 1,
    accountId: 1,
    categoryId: 1,
    createdByUserId: 1,
    isHighlighted: false,
    amount: 100.5,
    type: 'expense',
    currency: 'USD',
    date: '2024-05-24T00:00:00.000Z',
    note: 'Test transaction',
    recurrenceId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPagedTransactions: PagedTransactions = {
    items: [mockTransaction],
    totalItems: 1,
    totalPages: 1,
    pageSize: 25,
    pageNumber: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockTransaction]),
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
    transactionService = new TransactionService();
    vi.clearAllMocks();
  });

  describe('getMany', () => {
    it('should get transactions with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await transactionService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(transactions.createdAt);
      expect(result).toEqual(mockPagedTransactions);
    });

    it('should apply all filters correctly', async () => {
      const filters = {
        groupId: 1,
        accountIds: [2],
        categoryIds: [3],
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        note: 'search term',
        sortBy: 'amount',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await transactionService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(transactions.groupId, 1);
      expect(mockInArray).toHaveBeenCalledWith(transactions.accountId, [2]);
      expect(mockInArray).toHaveBeenCalledWith(transactions.categoryId, [3]);
      expect(mockGte).toHaveBeenCalledWith(transactions.date, '2024-01-01');
      expect(mockLte).toHaveBeenCalledWith(transactions.date, '2024-12-31');
      expect(mockIlike).toHaveBeenCalledWith(transactions.note, '%search term%');
      expect(mockDesc).toHaveBeenCalledWith(transactions.amount);
      expect(result).toEqual({ ...mockPagedTransactions, pageSize: 10, pageNumber: 2 });
    });

    it('should handle sorting by date', async () => {
      const filters = { sortBy: 'date', sortOrder: 'asc' };

      mockValidate.mockResolvedValue({ data: { ...filters, pageSize: 25, pageNumber: 1 } });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockAsc).toHaveBeenCalledWith(transactions.date);
    });

    it('should handle string categoryIds conversion', async () => {
      const filters = { categoryIds: ['3'] };

      mockValidate.mockResolvedValue({
        data: { categoryIds: [3], sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockInArray).toHaveBeenCalledWith(transactions.categoryId, [3]);
    });

    it('should handle multiple transaction IDs filtering', async () => {
      const filters = { ids: [1, 2, 3] };

      mockValidate.mockResolvedValue({
        data: { ...filters, sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockInArray).toHaveBeenCalledWith(transactions.id, [1, 2, 3]);
    });

    it('should handle multiple account IDs filtering', async () => {
      const filters = { accountIds: [10, 20] };

      mockValidate.mockResolvedValue({
        data: { ...filters, sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockInArray).toHaveBeenCalledWith(transactions.accountId, [10, 20]);
    });

    it('should handle multiple category IDs filtering', async () => {
      const filters = { categoryIds: [5, 6, 7] };

      mockValidate.mockResolvedValue({
        data: { ...filters, sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockInArray).toHaveBeenCalledWith(transactions.categoryId, [5, 6, 7]);
    });

    it('should skip multiple ID filters when arrays are empty', async () => {
      const filters = { ids: [], accountIds: [], categoryIds: [] };

      mockValidate.mockResolvedValue({
        data: { ...filters, sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockInArray).not.toHaveBeenCalled();
    });

    it('should combine multiple ID filters', async () => {
      const filters = {
        ids: [1],
        accountIds: [10, 20],
        categoryIds: [5],
      };

      mockValidate.mockResolvedValue({
        data: { ...filters, sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 },
      });

      mockDb.select.mockReturnValue(mockSelectMany());

      await transactionService.getMany(filters);

      expect(mockInArray).toHaveBeenCalledWith(transactions.id, [1]);
      expect(mockInArray).toHaveBeenCalledWith(transactions.categoryId, [5]);
      expect(mockInArray).toHaveBeenCalledWith(transactions.accountId, [10, 20]);
    });
  });

  describe('getSingle', () => {
    it('should get a single transaction by conditions', async () => {
      const filters = { ids: [1], groupId: 1 };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockTransaction]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await transactionService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(transactions.id, 1);
      expect(mockEq).toHaveBeenCalledWith(transactions.groupId, 1);
      expect(mockAnd).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    it('should return undefined when no transaction found', async () => {
      const filters = { id: 999 };

      mockValidate.mockResolvedValue({ data: filters });
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await transactionService.getSingle(filters);

      expect(result).toBeUndefined();
    });
  });

  describe('createSingle', () => {
    it('should create a new transaction', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: 150.75,
        currency: 'EUR',
        type: 'expense',
        date: '2024-05-25',
        note: 'New transaction',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      // Mock transaction builder chain
      const mockTxInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTransaction]),
        }),
      });

      const mockTxSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ id: 1, amount: 1000 }]),
          }),
        }),
      });

      const mockTxUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // Mock transaction callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDb.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const mockTx = {
          insert: mockTxInsert,
          select: mockTxSelect,
          update: mockTxUpdate,
        };
        return await callback(mockTx);
      });

      const result = await transactionService.createSingle(transactionData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), transactionData);
      expect(mockDb.transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual(mockTransaction);
    });

    it('should throw error when amount is undefined', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: undefined,
        currency: 'USD',
        date: '2024-05-25',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      await expect(transactionService.createSingle(transactionData)).rejects.toThrow('amount is required');
    });

    it('should throw error when categoryId is undefined', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: undefined,
        createdByUserId: 1,
        amount: 100,
        currency: 'USD',
        date: '2024-05-25',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      await expect(transactionService.createSingle(transactionData)).rejects.toThrow('categoryId is required');
    });
  });

  describe('updateSingle', () => {
    it('should update a transaction by id', async () => {
      const id = 1;
      const updateData = {
        amount: 200,
        note: 'Updated transaction',
        categoryId: 2,
        type: 'expense',
      };

      const existingTransaction = { ...mockTransaction, amount: 150 };
      const updatedTransaction = { ...mockTransaction, ...updateData };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockTxUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTransaction]),
          }),
        }),
      });

      // Mock transaction callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDb.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                // Mock both the initial transaction select and the account lock select
                for: vi.fn().mockResolvedValue([{ id: 1, amount: 1000 }]),
                mockResolvedValue: vi.fn().mockResolvedValue([existingTransaction]),
              }),
            }),
          }),
          update: mockTxUpdate,
        };
        // Mock the first select call differently
        mockTx.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingTransaction]),
          }),
        });
        return await callback(mockTx);
      });

      const result = await transactionService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual(updatedTransaction);
    });
  });

  describe('deleteSingle', () => {
    it('should delete a transaction by id', async () => {
      const id = 1;
      const existingTransaction = { ...mockTransaction, amount: 150, type: 'expense' };

      // Mock transaction builder chain for select (get existing)
      const mockTxDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([existingTransaction]),
        }),
      });

      const mockTxUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      // Mock transaction callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDb.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const mockTx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                for: vi.fn().mockResolvedValue([{ id: 1, amount: 1000 }]),
              }),
            }),
          }),
          delete: mockTxDelete,
          update: mockTxUpdate,
        };
        // Mock the first select call for getting existing transaction
        mockTx.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([existingTransaction]),
          }),
        });
        return await callback(mockTx);
      });

      const result = await transactionService.deleteSingle(id);

      expect(mockDb.transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual(existingTransaction);
    });
  });
});

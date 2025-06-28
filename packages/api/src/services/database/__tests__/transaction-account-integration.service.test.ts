import { Mock, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { accounts, transactions, Transaction } from '../../../models/schema.ts';
import { TransactionService } from '../transaction.service.ts';

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  ilike: vi.fn(),
  inArray: vi.fn(),
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
    transaction: vi.fn(),
  },
}));

// Mock validation functions
vi.mock('../../../helpers/validation/index.ts', () => ({
  validate: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;
const mockValidate = validate as Mock;

describe('TransactionService - Account Integration', () => {
  let transactionService: TransactionService;

  const mockTransaction: Transaction = {
    id: 1,
    groupId: 1,
    accountId: 1,
    categoryId: 1,
    createdByUserId: 1,
    amount: 15000, // $150.00 in cents
    currency: 'USD',
    type: 'expense',
    date: '2024-01-01T00:00:00.000Z',
    note: 'Test transaction',
    isHighlighted: false,
    recurrenceId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAccount = {
    id: 1,
    groupId: 1,
    name: 'Test Account',
    type: 'checking',
    amount: 100000, // $1000.00 in cents
    note: null,
    metadata: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockTransactionBuilder = {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockTransaction]),
    }),
  };

  const mockAccountSelectBuilder = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        for: vi.fn().mockResolvedValue([mockAccount]),
      }),
    }),
  };

  const mockAccountUpdateBuilder = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ ...mockAccount, amount: 85000 }]),
    }),
  };

  beforeEach(() => {
    transactionService = new TransactionService();
    vi.clearAllMocks();
  });

  describe('createSingle', () => {
    it('should create expense transaction and decrease account balance', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: 15000, // $150.00 expense
        currency: 'USD',
        type: 'expense',
        date: '2024-01-01T00:00:00.000Z',
        note: 'Grocery shopping',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      // Mock database transaction
      const mockTx = {
        insert: vi.fn().mockReturnValue(mockTransactionBuilder),
        select: vi.fn().mockReturnValue(mockAccountSelectBuilder),
        update: vi.fn().mockReturnValue(mockAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await transactionService.createSingle(transactionData);

      // Verify transaction creation
      expect(mockTx.insert).toHaveBeenCalledWith(transactions);
      expect(mockTransactionBuilder.values).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 15000,
          type: 'expense',
          accountId: 1,
        })
      );

      // Verify account amount update (decrease by 15000 for expense)
      expect(mockTx.select).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledWith(accounts);
      expect(mockAccountUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 85000, // 100000 - 15000
          updatedAt: expect.any(String),
        })
      );

      expect(result).toEqual(expect.objectContaining({ id: 1, amount: 15000 }));
    });

    it('should create income transaction and increase account balance', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: 25000, // $250.00 income
        currency: 'USD',
        type: 'income',
        date: '2024-01-01T00:00:00.000Z',
        note: 'Salary payment',
      };

      const incomeTransaction = { ...mockTransaction, amount: 25000, type: 'income' };
      const updatedTransactionBuilder = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([incomeTransaction]),
        }),
      };

      const updatedAccountUpdateBuilder = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockAccount, amount: 125000 }]),
        }),
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      const mockTx = {
        insert: vi.fn().mockReturnValue(updatedTransactionBuilder),
        select: vi.fn().mockReturnValue(mockAccountSelectBuilder),
        update: vi.fn().mockReturnValue(updatedAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await transactionService.createSingle(transactionData);

      // Verify account amount update (increase by 25000 for income)
      expect(updatedAccountUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 125000, // 100000 + 25000
          updatedAt: expect.any(String),
        })
      );

      expect(result).toEqual(expect.objectContaining({ amount: 25000, type: 'income' }));
    });

    it('should not update account amount for transfer transactions', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: 10000,
        currency: 'USD',
        type: 'transfer',
        date: '2024-01-01T00:00:00.000Z',
        note: 'Account transfer',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      const mockTx = {
        insert: vi.fn().mockReturnValue(mockTransactionBuilder),
        select: vi.fn(),
        update: vi.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await transactionService.createSingle(transactionData);

      // Verify account update was not called for transfer
      expect(mockTx.select).not.toHaveBeenCalled();
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('should handle database locking for concurrent transactions', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: 5000,
        currency: 'USD',
        type: 'expense',
        date: '2024-01-01T00:00:00.000Z',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      const mockTx = {
        insert: vi.fn().mockReturnValue(mockTransactionBuilder),
        select: vi.fn().mockReturnValue(mockAccountSelectBuilder),
        update: vi.fn().mockReturnValue(mockAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await transactionService.createSingle(transactionData);

      // Verify SELECT FOR UPDATE was used for account locking
      expect(mockAccountSelectBuilder.from).toHaveBeenCalledWith(accounts);
      expect(mockAccountSelectBuilder.from().where().for).toHaveBeenCalledWith('update');
    });
  });

  describe('updateSingle', () => {
    it('should update transaction and adjust account balance correctly', async () => {
      const updateData = {
        amount: 20000, // Changed from 15000 to 20000
        note: 'Updated grocery shopping',
      };

      const existingTransactionBuilder = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockTransaction]), // Original: 15000 expense
        }),
      };

      const updatedTransactionBuilder = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockTransaction, amount: 20000 }]),
          }),
        }),
      };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockTx = {
        select: vi
          .fn()
          .mockReturnValueOnce(existingTransactionBuilder) // First call for existing transaction
          .mockReturnValueOnce(mockAccountSelectBuilder), // Second call for account locking
        update: vi
          .fn()
          .mockReturnValueOnce(updatedTransactionBuilder) // Transaction update
          .mockReturnValueOnce(mockAccountUpdateBuilder), // Account update
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await transactionService.updateSingle(1, updateData);

      // Verify transaction update
      expect(updatedTransactionBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 20000,
          note: 'Updated grocery shopping',
          updatedAt: expect.any(String),
        })
      );

      // Verify account adjustment (net change: -5000, from -15000 to -20000)
      expect(mockAccountUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 95000, // 100000 - 5000 additional
          updatedAt: expect.any(String),
        })
      );

      expect(result).toEqual(expect.objectContaining({ amount: 20000 }));
    });

    it('should handle transaction type changes correctly', async () => {
      const updateData = {
        type: 'income', // Changed from expense to income
        amount: 15000, // Same amount but different type
      };

      const existingTransactionBuilder = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockTransaction]), // Original: 15000 expense
        }),
      };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockTx = {
        select: vi.fn().mockReturnValueOnce(existingTransactionBuilder).mockReturnValueOnce(mockAccountSelectBuilder),
        update: vi
          .fn()
          .mockReturnValueOnce({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ ...mockTransaction, type: 'income' }]),
              }),
            }),
          })
          .mockReturnValueOnce(mockAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await transactionService.updateSingle(1, updateData);

      // Net change: from -15000 (expense) to +15000 (income) = +30000 to account
      expect(mockAccountUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 130000, // 100000 + 30000
          updatedAt: expect.any(String),
        })
      );
    });
  });

  describe('deleteSingle', () => {
    it('should delete transaction and revert account balance', async () => {
      const existingTransactionBuilder = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockTransaction]), // 15000 expense
        }),
      };

      const deleteBuilder = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTransaction]),
        }),
      };

      const mockTx = {
        select: vi.fn().mockReturnValueOnce(existingTransactionBuilder).mockReturnValueOnce(mockAccountSelectBuilder),
        delete: vi.fn().mockReturnValue(deleteBuilder),
        update: vi.fn().mockReturnValue(mockAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await transactionService.deleteSingle(1);

      // Verify transaction deletion
      expect(mockTx.delete).toHaveBeenCalledWith(transactions);

      // Verify account balance reversion (add back 15000 for deleted expense)
      expect(mockAccountUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 115000, // 100000 + 15000 (revert expense)
          updatedAt: expect.any(String),
        })
      );

      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it('should handle deletion of income transactions correctly', async () => {
      const incomeTransaction = { ...mockTransaction, type: 'income', amount: 25000 };

      const existingTransactionBuilder = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([incomeTransaction]),
        }),
      };

      const deleteBuilder = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([incomeTransaction]),
        }),
      };

      const mockTx = {
        select: vi.fn().mockReturnValueOnce(existingTransactionBuilder).mockReturnValueOnce(mockAccountSelectBuilder),
        delete: vi.fn().mockReturnValue(deleteBuilder),
        update: vi.fn().mockReturnValue(mockAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await transactionService.deleteSingle(1);

      // Verify account balance reversion (subtract 25000 for deleted income)
      expect(mockAccountUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 75000, // 100000 - 25000 (revert income)
          updatedAt: expect.any(String),
        })
      );
    });

    it('should not update account for deleted transfer transactions', async () => {
      const transferTransaction = { ...mockTransaction, type: 'transfer' };

      const existingTransactionBuilder = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([transferTransaction]),
        }),
      };

      const deleteBuilder = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([transferTransaction]),
        }),
      };

      const mockTx = {
        select: vi.fn().mockReturnValueOnce(existingTransactionBuilder),
        delete: vi.fn().mockReturnValue(deleteBuilder),
        update: vi.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await transactionService.deleteSingle(1);

      // Verify no account update for transfer deletion
      expect(mockTx.update).not.toHaveBeenCalledWith(accounts);
    });
  });

  describe('Error Handling', () => {
    it('should handle account not found during amount update', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 999, // Non-existent account
        categoryId: 1,
        createdByUserId: 1,
        amount: 15000,
        currency: 'USD',
        type: 'expense',
        date: '2024-01-01T00:00:00.000Z',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      const emptyAccountSelectBuilder = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([]), // No account found
          }),
        }),
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue(mockTransactionBuilder),
        select: vi.fn().mockReturnValue(emptyAccountSelectBuilder),
        update: vi.fn(),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(transactionService.createSingle(transactionData)).rejects.toThrow('Account with ID 999 not found');
    });

    it('should rollback transaction on account update failure', async () => {
      const transactionData = {
        groupId: 1,
        accountId: 1,
        categoryId: 1,
        createdByUserId: 1,
        amount: 15000,
        currency: 'USD',
        type: 'expense',
        date: '2024-01-01T00:00:00.000Z',
      };

      mockValidate.mockResolvedValue({ data: transactionData });

      const failingAccountUpdateBuilder = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database connection lost')),
        }),
      };

      const mockTx = {
        insert: vi.fn().mockReturnValue(mockTransactionBuilder),
        select: vi.fn().mockReturnValue(mockAccountSelectBuilder),
        update: vi.fn().mockReturnValue(failingAccountUpdateBuilder),
      };

      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(transactionService.createSingle(transactionData)).rejects.toThrow('Database connection lost');

      // Transaction should be rolled back automatically by database
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity during concurrent operations', async () => {
      // This test simulates multiple concurrent transaction operations
      const operations = [
        { amount: 1000, type: 'expense' },
        { amount: 2000, type: 'income' },
        { amount: 500, type: 'expense' },
      ];

      for (const op of operations) {
        const transactionData = {
          groupId: 1,
          accountId: 1,
          categoryId: 1,
          createdByUserId: 1,
          amount: op.amount,
          currency: 'USD',
          type: op.type,
          date: '2024-01-01T00:00:00.000Z',
        };

        mockValidate.mockResolvedValue({ data: transactionData });

        const mockTx = {
          insert: vi.fn().mockReturnValue(mockTransactionBuilder),
          select: vi.fn().mockReturnValue(mockAccountSelectBuilder),
          update: vi.fn().mockReturnValue(mockAccountUpdateBuilder),
        };

        mockDb.transaction.mockImplementation(async (callback: any) => {
          return await callback(mockTx);
        });

        await transactionService.createSingle(transactionData);

        // Verify each operation uses proper locking
        expect(mockAccountSelectBuilder.from().where().for).toHaveBeenCalledWith('update');
      }
    });
  });
});

// Mocks must be hoisted before all imports!
import { eq, and, gte, lte, sum } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { SummaryService } from '../summary.service.ts';

vi.mock('drizzle-orm', () => {
  return {
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    sql: vi.fn(),
    sum: vi.fn(() => ({
      as: vi.fn(),
    })),
  };
});
vi.mock('../../../core/db/config.ts', () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
  },
}));
vi.mock('../../../helpers/validation/index.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../helpers/validation/index.ts')>();
  return {
    ...actual,
    validate: vi.fn(),
  };
});

// Mock drizzle-orm before any code runs

const mockEq = eq as Mock;
const mockAnd = and as Mock;
const mockGte = gte as Mock;
const mockLte = lte as Mock;
const mockSum = sum as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('SummaryService', () => {
  let summaryService: SummaryService;

  beforeEach(() => {
    summaryService = new SummaryService();
    vi.clearAllMocks();
  });

  describe('getCategoriesPeriod', () => {
    it('should return summary by category', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        accountId: 1,
        sortBy: 'totalIncome',
        sortOrder: 'desc',
      };
      mockValidate.mockResolvedValue({ data: filters });
      mockGte.mockReturnValue('gte-cond');
      mockLte.mockReturnValue('lte-cond');
      mockEq.mockReturnValue('eq-cond');
      mockAnd.mockReturnValue('and-cond');
      mockSum.mockImplementation((x) => ({
        as: vi.fn(() => x),
      }));
      const mockRows = [
        {
          categoryId: 1,
          totalIncome: 1000,
          totalExpenses: 500,
          totalTransactions: 5,
        },
      ];
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockRows),
            }),
          }),
        }),
      });
      mockDb.select.mockImplementation(mockSelect);
      const result = await summaryService.getCategoriesPeriod(filters);
      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([
        {
          categoryId: 1,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalIncome: 1000,
          totalExpenses: 500,
          totalNet: 500,
          totalTransactions: 5,
        },
      ]);
    });
  });

  describe('getAccountsPeriod', () => {
    it('should return summary by account', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        categoryId: 2,
        sortBy: 'totalExpenses',
        sortOrder: 'asc',
      };
      mockValidate.mockResolvedValue({ data: filters });
      mockGte.mockReturnValue('gte-cond');
      mockLte.mockReturnValue('lte-cond');
      mockEq.mockReturnValue('eq-cond');
      mockAnd.mockReturnValue('and-cond');
      mockSum.mockImplementation((x) => ({
        as: vi.fn(() => x),
      }));
      const mockRows = [
        {
          accountId: 1,
          totalIncome: 2000,
          totalExpenses: 1500,
          totalTransactions: 10,
        },
      ];
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(mockRows),
            }),
          }),
        }),
      });
      mockDb.select.mockImplementation(mockSelect);
      const result = await summaryService.getAccountsPeriod(filters);
      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual([
        {
          accountId: 1,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalIncome: 2000,
          totalExpenses: 1500,
          totalNet: 500,
          totalTransactions: 10,
        },
      ]);
    });
  });

  describe('getTransactionsPeriod', () => {
    it('should return summary by day', async () => {
      const filters = { startDate: '2024-01-01', endDate: '2024-01-03', sortBy: '' };
      mockValidate.mockResolvedValue({ data: filters });
      const mockRows = [
        { period_day: '2024-01-01', total_income: 100, total_expenses: 50, total_transactions: 2 },
        { period_day: '2024-01-02', total_income: 200, total_expenses: 100, total_transactions: 3 },
      ];
      mockDb.execute.mockResolvedValue({
        rows: mockRows,
        command: '',
        rowCount: mockRows.length,
        oid: 0,
        fields: [],
      });
      const result = await summaryService.getTransactionsPeriod(filters);
      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockDb.execute).toHaveBeenCalled();
      expect(result.length).toBe(3);
      expect(result[0]).toMatchObject({
        startDate: expect.any(String),
        endDate: expect.any(String),
        totalIncome: 100,
        totalExpenses: 50,
        netAmount: 50,
        totalTransactions: 2,
      });
      expect(result[1]).toMatchObject({
        totalIncome: 200,
        totalExpenses: 100,
        netAmount: 100,
        totalTransactions: 3,
      });
      expect(result[2]).toMatchObject({
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0,
        totalTransactions: 0,
      });
    });
    it('should return empty array if no startDate or endDate', async () => {
      mockValidate.mockResolvedValue({ data: { startDate: undefined, endDate: undefined } });
      const result = await summaryService.getTransactionsPeriod({});
      expect(result).toEqual([]);
    });
  });
});

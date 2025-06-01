import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { AccountLimitService } from '../../database/account-limit.service.ts';
import { UserPreferenceService } from '../../database/user-preference.service.ts';
import { AccountLimitValidationService } from '../account-limit-validation.service.ts';

// Mock the dependencies
vi.mock('../../database/account-limit.service.ts');
vi.mock('../../database/user-preference.service.ts');
vi.mock('../../../core/db/config.ts');

describe('AccountLimitValidationService', () => {
  let validationService: AccountLimitValidationService;
  let mockAccountLimitService: any;
  let mockUserPreferenceService: any;
  let mockDb: any;

  beforeEach(() => {
    validationService = new AccountLimitValidationService();
    mockAccountLimitService = vi.mocked(AccountLimitService).prototype as unknown;
    mockUserPreferenceService = vi.mocked(UserPreferenceService).prototype as unknown;
    mockDb = vi.mocked(db) as unknown;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTransactionAgainstLimits', () => {
    const mockUserPreferences = {
      id: 1,
      userId: 1,
      monthlyStartDate: 1,
      weeklyStartDay: 1, // Monday
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const mockWeeklyLimit = {
      id: 1,
      accountId: 1,
      period: 'week',
      limit: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMonthlyLimit = {
      id: 2,
      accountId: 1,
      period: 'month',
      limit: 2000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockUserPreferenceService.getByUserId.mockResolvedValue(mockUserPreferences);
    });

    it('should return valid when no limits exist', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [] });

      const result = await validationService.validateTransactionAgainstLimits(1, 100, '2024-01-15T10:00:00Z', 1);

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate transaction within weekly limit', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });

      // Mock current spending of 200
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '200' }]),
        }),
      });

      const result = await validationService.validateTransactionAgainstLimits(
        1,
        100, // Adding 100 to 200 = 300, which is within 500 limit
        '2024-01-15T10:00:00Z',
        1
      );

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect exceeded weekly limit', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });

      // Mock current spending of 450
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '450' }]),
        }),
      });

      const result = await validationService.validateTransactionAgainstLimits(
        1,
        100, // Adding 100 to 450 = 550, which exceeds 500 limit
        '2024-01-15T10:00:00Z',
        1
      );

      expect(result.isValid).toBe(false);
      expect(result.exceededLimits).toHaveLength(1);
      expect(result.exceededLimits[0].limit).toEqual(mockWeeklyLimit);
      expect(result.exceededLimits[0].currentSpent).toBe(450);
      expect(result.exceededLimits[0].remainingAmount).toBe(50);
    });

    it('should detect warning when approaching limit (80% threshold)', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });

      // Mock current spending of 350
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '350' }]),
        }),
      });

      const result = await validationService.validateTransactionAgainstLimits(
        1,
        100, // Adding 100 to 350 = 450, which is 90% of 500 limit (above 80% threshold)
        '2024-01-15T10:00:00Z',
        1
      );

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].limit).toEqual(mockWeeklyLimit);
      expect(result.warnings[0].warningThreshold).toBe(400); // 80% of 500
    });

    it('should handle multiple limits correctly', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({
        items: [mockWeeklyLimit, mockMonthlyLimit],
      });

      // Mock current spending of 450 for both periods
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '450' }]),
        }),
      });

      const result = await validationService.validateTransactionAgainstLimits(
        1,
        100, // Adding 100: weekly 550 > 500 (exceeded), monthly 550 < 2000 (ok)
        '2024-01-15T10:00:00Z',
        1
      );

      expect(result.isValid).toBe(false);
      expect(result.exceededLimits).toHaveLength(1);
      expect(result.exceededLimits[0].limit).toEqual(mockWeeklyLimit);
      expect(result.warnings).toHaveLength(0);
    });

    it('should throw error when user preferences not found', async () => {
      mockUserPreferenceService.getByUserId.mockResolvedValue(null);
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });

      await expect(
        validationService.validateTransactionAgainstLimits(1, 100, '2024-01-15T10:00:00Z', 1)
      ).rejects.toThrow('User preferences not found');
    });

    it('should bypass validation for income transactions', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });

      const result = await validationService.validateTransactionAgainstLimits(
        1,
        100000, // Large amount that would exceed any limit
        '2024-01-15T10:00:00Z',
        1,
        'income'
      );

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should bypass validation for transfer transactions', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });

      const result = await validationService.validateTransactionAgainstLimits(
        1,
        100000, // Large amount that would exceed any limit
        '2024-01-15T10:00:00Z',
        1,
        'transfer'
      );

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateTransactionUpdateAgainstLimits', () => {
    const mockUserPreferences = {
      id: 1,
      userId: 1,
      monthlyStartDate: 1,
      weeklyStartDay: 1, // Monday
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const mockWeeklyLimit = {
      id: 1,
      accountId: 1,
      period: 'week',
      limit: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockUserPreferenceService.getByUserId.mockResolvedValue(mockUserPreferences);
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockWeeklyLimit] });
    });

    it('should return valid when transaction amount is decreasing', async () => {
      const existingTransaction = { accountId: 1, amount: 200, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { amount: 150 }; // decreasing

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid when transaction amount stays the same', async () => {
      const existingTransaction = { accountId: 1, amount: 200, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { amount: 200 }; // same amount

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate the difference when amount is increasing', async () => {
      // Mock current spending of 300
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '300' }]),
        }),
      });

      const existingTransaction = { accountId: 1, amount: 200, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { amount: 350 }; // increase of 150

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      // Should validate if adding 150 more (the difference) would exceed limits
      // Current: 300, adding 150 difference = 450, which is under 500 limit
      expect(result.isValid).toBe(true);
    });

    it('should detect exceeded limits when increasing amount would exceed', async () => {
      // Mock current spending of 400
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '400' }]),
        }),
      });

      const existingTransaction = { accountId: 1, amount: 100, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { amount: 250 }; // increase of 150

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      // Should validate if adding 150 more would exceed limits
      // Current: 400, adding 150 difference = 550, which exceeds 500 limit
      expect(result.isValid).toBe(false);
      expect(result.exceededLimits).toHaveLength(1);
    });

    it('should handle account changes as full validation', async () => {
      // Mock current spending for new account
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '450' }]),
        }),
      });

      const existingTransaction = { accountId: 1, amount: 200, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { accountId: 2, amount: 300 }; // different account

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      // Should validate full 300 amount against new account's limits
      // Current spending: 450, adding 300 = 750, which exceeds 500 limit
      expect(result.isValid).toBe(false);
      expect(result.exceededLimits).toHaveLength(1);
    });

    it('should handle date changes correctly', async () => {
      // Mock current spending
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '200' }]),
        }),
      });

      const existingTransaction = { accountId: 1, amount: 150, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { amount: 250, date: '2024-01-16T10:00:00Z' }; // amount increase and date change

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      // Should validate the difference (100) against the new date period
      expect(result.isValid).toBe(true);
    });

    it('should bypass validation for non-expense transactions', async () => {
      const existingTransaction = { accountId: 1, amount: 100, date: '2024-01-15T10:00:00Z', type: 'income' };
      const updatePayload = { amount: 1000000 }; // huge amount that would normally exceed any limit

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      // Should bypass validation for income transactions
      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
    });

    it('should bypass validation when changing from expense to income', async () => {
      const existingTransaction = { accountId: 1, amount: 100, date: '2024-01-15T10:00:00Z', type: 'expense' };
      const updatePayload = { type: 'income' };

      const result = await validationService.validateTransactionUpdateAgainstLimits(
        existingTransaction,
        updatePayload,
        1 // userId
      );

      // Should bypass validation when changing to income type
      expect(result.isValid).toBe(true);
      expect(result.exceededLimits).toHaveLength(0);
    });
  });

  describe('Period boundary calculations', () => {
    it('should calculate weekly boundaries correctly for Monday start', () => {
      const service = new AccountLimitValidationService();
      const testDate = new Date('2024-01-17T10:00:00Z'); // Wednesday

      // Access private method through type casting for testing
      const result = (
        service as unknown as { calculateWeeklyBoundaries: (date: Date, startDay: number) => unknown }
      ).calculateWeeklyBoundaries(testDate, 1) as any;

      expect(result.periodStart.getDay()).toBe(1); // Monday
      expect(result.periodEnd.getDay()).toBe(0); // Sunday
    });

    it('should calculate monthly boundaries correctly', () => {
      const service = new AccountLimitValidationService();
      const testDate = new Date('2024-01-15T10:00:00Z'); // 15th of month

      // Access private method through type casting for testing
      const result = (service as any).calculateMonthlyBoundaries(testDate, 1); // 1st start date

      expect(result.periodStart.getDate()).toBe(1);
      expect(result.periodEnd.getDate()).toBe(31); // Last day of January 2024
    });
  });

  describe('getRemainingBudgets', () => {
    const mockUserPreferences = {
      id: 1,
      userId: 1,
      monthlyStartDate: 1,
      weeklyStartDay: 1,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const mockLimit = {
      id: 1,
      accountId: 1,
      period: 'week',
      limit: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockUserPreferenceService.getByUserId.mockResolvedValue(mockUserPreferences);
    });

    it('should return empty array when no limits exist', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [] });

      const result = await validationService.getRemainingBudgets(1, 1);

      expect(result.limits).toHaveLength(0);
    });

    it('should calculate remaining budgets correctly', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockLimit] });

      // Mock current spending of 300
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '300' }]),
        }),
      });

      const result = await validationService.getRemainingBudgets(1, 1);

      expect(result.limits).toHaveLength(1);
      expect(result.limits[0].currentSpent).toBe(300);
      expect(result.limits[0].remainingAmount).toBe(200); // 500 - 300
      expect(result.limits[0].utilizationPercentage).toBe(60); // (300/500) * 100
    });

    it('should handle over-spent limits correctly', async () => {
      mockAccountLimitService.getMany.mockResolvedValue({ items: [mockLimit] });

      // Mock current spending of 600 (exceeds 500 limit)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: '600' }]),
        }),
      });

      const result = await validationService.getRemainingBudgets(1, 1);

      expect(result.limits).toHaveLength(1);
      expect(result.limits[0].currentSpent).toBe(600);
      expect(result.limits[0].remainingAmount).toBe(0); // Math.max(0, 500 - 600)
      expect(result.limits[0].utilizationPercentage).toBe(120); // (600/500) * 100
    });
  });
});

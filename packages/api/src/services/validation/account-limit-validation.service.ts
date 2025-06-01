import { eq, and, gte, lte, sum } from 'drizzle-orm';

import { db } from '../../core/db/config.ts';
import { BadRequestException } from '../../helpers/exceptions/index.ts';
import { transactions, AccountLimit } from '../../models/schema.ts';
import { AccountLimitService } from '../database/account-limit.service.ts';
import { UserPreferenceService } from '../database/user-preference.service.ts';

export interface AccountLimitValidationResult {
  isValid: boolean;
  exceededLimits: {
    limit: AccountLimit;
    currentSpent: number;
    remainingAmount: number;
    periodStart: Date;
    periodEnd: Date;
  }[];
  warnings: {
    limit: AccountLimit;
    currentSpent: number;
    remainingAmount: number;
    periodStart: Date;
    periodEnd: Date;
    warningThreshold: number;
  }[];
}

export class AccountLimitValidationService {
  private accountLimitService = new AccountLimitService();
  private userPreferenceService = new UserPreferenceService();

  /**
   * Validate if a transaction can be created without exceeding account limits
   * Only validates expense transactions against limits
   */
  async validateTransactionAgainstLimits(
    accountId: number,
    transactionAmount: number,
    transactionDate: string,
    userId: number,
    transactionType: string = 'expense'
  ): Promise<AccountLimitValidationResult> {
    // Only validate expense transactions against limits
    if (transactionType !== 'expense') {
      return { isValid: true, exceededLimits: [], warnings: [] };
    }

    const limitData = await this.accountLimitService.getMany({ accountId });
    const limits = limitData.items;

    if (limits.length === 0) {
      return { isValid: true, exceededLimits: [], warnings: [] };
    }

    const userPreferences = await this.userPreferenceService.getByUserId(userId);
    if (!userPreferences) {
      throw new BadRequestException('User preferences not found');
    }

    const result: AccountLimitValidationResult = {
      isValid: true,
      exceededLimits: [],
      warnings: [],
    };

    for (const limit of limits) {
      const { periodStart, periodEnd } = this.calculatePeriodBoundaries(
        limit.period,
        transactionDate,
        userPreferences.monthlyStartDate,
        userPreferences.weeklyStartDay
      );

      const currentSpent = await this.calculateCurrentSpending(accountId, periodStart, periodEnd);

      const totalAfterTransaction = currentSpent + transactionAmount;
      const remainingAmount = limit.limit - currentSpent;

      if (totalAfterTransaction > limit.limit) {
        result.isValid = false;
        result.exceededLimits.push({
          limit,
          currentSpent,
          remainingAmount,
          periodStart,
          periodEnd,
        });
      } else {
        const warningThreshold = limit.limit * 0.8;
        if (totalAfterTransaction > warningThreshold) {
          result.warnings.push({
            limit,
            currentSpent,
            remainingAmount,
            periodStart,
            periodEnd,
            warningThreshold,
          });
        }
      }
    }

    return result;
  }

  async validateTransactionUpdateAgainstLimits(
    existingTransaction: { accountId: number; amount: number; date: string; type: string },
    updatePayload: { accountId?: number; amount?: number; date?: string; type?: string },
    userId: number
  ): Promise<AccountLimitValidationResult> {
    const currentAccountId = existingTransaction.accountId;
    const currentAmount = existingTransaction.amount;
    const currentDate = existingTransaction.date;
    const currentType = existingTransaction.type;

    const newAccountId = updatePayload.accountId ?? currentAccountId;
    const newAmount = updatePayload.amount ?? currentAmount;
    const newDate = updatePayload.date ?? currentDate;
    const newType = updatePayload.type ?? currentType;

    // Only validate expense transactions against limits
    if (newType !== 'expense') {
      return { isValid: true, exceededLimits: [], warnings: [] };
    }

    const amountDifference = newAmount - currentAmount;

    if (newAccountId !== currentAccountId) {
      return this.validateTransactionAgainstLimits(newAccountId, newAmount, newDate, userId, newType);
    }

    // For same account updates, only validate the difference
    if (amountDifference <= 0) {
      return { isValid: true, exceededLimits: [], warnings: [] };
    }

    return this.validateTransactionAgainstLimits(currentAccountId, amountDifference, newDate, userId, newType);
  }

  /**
   * Calculate period boundaries based on limit type and user preferences
   */
  private calculatePeriodBoundaries(
    period: string,
    transactionDate: string,
    monthlyStartDate: number,
    weeklyStartDay: number
  ): { periodStart: Date; periodEnd: Date } {
    const transDate = new Date(transactionDate);

    if (period === 'week') {
      return this.calculateWeeklyBoundaries(transDate, weeklyStartDay);
    } else if (period === 'month') {
      return this.calculateMonthlyBoundaries(transDate, monthlyStartDate);
    }

    throw new BadRequestException(`Unsupported period type: ${period}`);
  }

  /**
   * Calculate weekly period boundaries
   */
  private calculateWeeklyBoundaries(
    transactionDate: Date,
    weeklyStartDay: number
  ): { periodStart: Date; periodEnd: Date } {
    const transDate = new Date(transactionDate);
    const dayOfWeek = transDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate days from the configured start day
    let daysFromStart = dayOfWeek - weeklyStartDay;
    if (daysFromStart < 0) {
      daysFromStart += 7;
    }

    // Calculate period start (beginning of configured week day)
    const periodStart = new Date(transDate);
    periodStart.setDate(transDate.getDate() - daysFromStart);
    periodStart.setHours(0, 0, 0, 0);

    // Calculate period end (end of configured week day + 6 days)
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);

    return { periodStart, periodEnd };
  }

  /**
   * Calculate monthly period boundaries
   */
  private calculateMonthlyBoundaries(
    transactionDate: Date,
    monthlyStartDate: number
  ): { periodStart: Date; periodEnd: Date } {
    const transDate = new Date(transactionDate);
    const currentDay = transDate.getDate();

    let periodStart: Date;
    let periodEnd: Date;

    if (currentDay >= monthlyStartDate) {
      // We're in the current period
      periodStart = new Date(transDate.getFullYear(), transDate.getMonth(), monthlyStartDate);
      periodEnd = new Date(transDate.getFullYear(), transDate.getMonth() + 1, monthlyStartDate - 1);
    } else {
      // We're in the previous period
      periodStart = new Date(transDate.getFullYear(), transDate.getMonth() - 1, monthlyStartDate);
      periodEnd = new Date(transDate.getFullYear(), transDate.getMonth(), monthlyStartDate - 1);
    }

    // Set time boundaries
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);

    return { periodStart, periodEnd };
  }

  /**
   * Calculate current spending for an account within a period
   */
  private async calculateCurrentSpending(accountId: number, periodStart: Date, periodEnd: Date): Promise<number> {
    const result = await db
      .select({
        total: sum(transactions.amount),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, accountId),
          gte(transactions.date, periodStart.toISOString()),
          lte(transactions.date, periodEnd.toISOString())
        )
      );

    return Number(result[0]?.total) || 0;
  }

  /**
   * Get remaining budget for all account limits
   */
  async getRemainingBudgets(
    accountId: number,
    userId: number,
    currentDate: string = new Date().toISOString()
  ): Promise<{
    limits: {
      limit: AccountLimit;
      currentSpent: number;
      remainingAmount: number;
      periodStart: Date;
      periodEnd: Date;
      utilizationPercentage: number;
    }[];
  }> {
    const limitData = await this.accountLimitService.getMany({ accountId });
    const limits = limitData.items;

    if (limits.length === 0) {
      return { limits: [] };
    }

    const userPreferences = await this.userPreferenceService.getByUserId(userId);
    if (!userPreferences) {
      throw new BadRequestException('User preferences not found');
    }

    const result = [];

    for (const limit of limits) {
      const { periodStart, periodEnd } = this.calculatePeriodBoundaries(
        limit.period,
        currentDate,
        userPreferences.monthlyStartDate,
        userPreferences.weeklyStartDay
      );

      const currentSpent = await this.calculateCurrentSpending(accountId, periodStart, periodEnd);
      const remainingAmount = Math.max(0, limit.limit - currentSpent);
      const utilizationPercentage = (currentSpent / limit.limit) * 100;

      result.push({
        limit,
        currentSpent,
        remainingAmount,
        periodStart,
        periodEnd,
        utilizationPercentage,
      });
    }

    return { limits: result };
  }
}

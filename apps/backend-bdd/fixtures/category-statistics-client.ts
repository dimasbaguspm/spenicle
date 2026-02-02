import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Category Statistics types from OpenAPI schemas
 */
export type CategoryStatisticsResponse =
  components["schemas"]["CategoryStatisticsResponse"];
export type CategoryStatisticSpendingVelocityModel =
  components["schemas"]["CategoryStatisticSpendingVelocityModel"];
export type CategoryStatisticAccountDistributionModel =
  components["schemas"]["CategoryStatisticAccountDistributionModel"];
export type CategoryStatisticAverageTransactionSizeModel =
  components["schemas"]["CategoryStatisticAverageTransactionSizeModel"];
export type CategoryStatisticDayOfWeekPatternModel =
  components["schemas"]["CategoryStatisticDayOfWeekPatternModel"];
export type CategoryStatisticBudgetUtilizationModel =
  components["schemas"]["CategoryStatisticBudgetUtilizationModel"];

/**
 * Query parameter types
 */
export type CategoryStatisticsParams =
  operations["get-category-statistics"]["parameters"]["query"];
export type SpendingVelocityParams =
  operations["get-spending-velocity"]["parameters"]["query"];
export type AccountDistributionParams =
  operations["get-account-distribution"]["parameters"]["query"];
export type AverageTransactionSizeParams =
  operations["get-average-transaction-size"]["parameters"]["query"];
export type DayOfWeekPatternParams =
  operations["get-day-of-week-pattern"]["parameters"]["query"];
export type BudgetUtilizationParams =
  operations["get-budget-utilization"]["parameters"]["query"];

/**
 * Category Statistics API client for category analytics and insights endpoints
 */
export class CategoryStatisticsAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get comprehensive category statistics
   * Returns all statistics including spending velocity, account distribution,
   * average transaction size, day-of-week patterns, and budget utilization
   */
  async getCategoryStatistics(
    categoryId: number,
    params?: CategoryStatisticsParams,
  ): Promise<APIResponse<CategoryStatisticsResponse>> {
    return this.get<CategoryStatisticsResponse>(
      `/categories/${categoryId}/statistics`,
      params,
    );
  }

  /**
   * Get spending velocity trend
   * Returns monthly spending trend over the specified period (line chart data)
   */
  async getSpendingVelocity(
    categoryId: number,
    params?: SpendingVelocityParams,
  ): Promise<APIResponse<CategoryStatisticSpendingVelocityModel>> {
    return this.get<CategoryStatisticSpendingVelocityModel>(
      `/categories/${categoryId}/statistics/spending-velocity`,
      params,
    );
  }

  /**
   * Get account distribution
   * Returns which accounts pay for this category (donut chart data)
   */
  async getAccountDistribution(
    categoryId: number,
    params?: AccountDistributionParams,
  ): Promise<APIResponse<CategoryStatisticAccountDistributionModel>> {
    return this.get<CategoryStatisticAccountDistributionModel>(
      `/categories/${categoryId}/statistics/account-distribution`,
      params,
    );
  }

  /**
   * Get average transaction size
   * Returns typical transaction amounts, including min, max, median, and average
   */
  async getAverageTransactionSize(
    categoryId: number,
    params?: AverageTransactionSizeParams,
  ): Promise<APIResponse<CategoryStatisticAverageTransactionSizeModel>> {
    return this.get<CategoryStatisticAverageTransactionSizeModel>(
      `/categories/${categoryId}/statistics/average-transaction-size`,
      params,
    );
  }

  /**
   * Get day-of-week pattern
   * Returns spending patterns by day of week to show behavioral patterns
   */
  async getDayOfWeekPattern(
    categoryId: number,
    params?: DayOfWeekPatternParams,
  ): Promise<APIResponse<CategoryStatisticDayOfWeekPatternModel>> {
    return this.get<CategoryStatisticDayOfWeekPatternModel>(
      `/categories/${categoryId}/statistics/day-of-week-pattern`,
      params,
    );
  }

  /**
   * Get budget utilization
   * Returns budget progress and remaining amounts for active budgets tied to this category
   */
  async getBudgetUtilization(
    categoryId: number,
    params?: BudgetUtilizationParams,
  ): Promise<APIResponse<CategoryStatisticBudgetUtilizationModel>> {
    return this.get<CategoryStatisticBudgetUtilizationModel>(
      `/categories/${categoryId}/statistics/budget-utilization`,
      params,
    );
  }
}

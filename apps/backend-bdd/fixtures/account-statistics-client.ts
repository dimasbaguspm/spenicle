import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Account Statistics types from OpenAPI schemas
 */
export type AccountStatisticsResponse =
  components["schemas"]["AccountStatisticsResponse"];
export type AccountStatisticsCategoryHeatmapModel =
  components["schemas"]["AccountStatisticsCategoryHeatmapModel"];
export type AccountStatisticsMonthlyVelocityModel =
  components["schemas"]["AccountStatisticsMonthlyVelocityModel"];
export type AccountStatisticsTimeFrequencyHeatmapModel =
  components["schemas"]["AccountStatisticsTimeFrequencyHeatmapModel"];
export type AccountStatisticsCashFlowPulseModel =
  components["schemas"]["AccountStatisticsCashFlowPulseModel"];
export type AccountStatisticsBurnRateModel =
  components["schemas"]["AccountStatisticsBurnRateModel"];
export type AccountStatisticsBudgetHealthModel =
  components["schemas"]["AccountStatisticsBudgetHealthModel"];

/**
 * Query parameter types
 */
export type AccountStatisticsParams =
  operations["get-account-statistics"]["parameters"]["query"];
export type CategoryHeatmapParams =
  operations["get-category-heatmap"]["parameters"]["query"];
export type MonthlyVelocityParams =
  operations["get-monthly-velocity"]["parameters"]["query"];
export type TimeFrequencyParams =
  operations["get-time-frequency"]["parameters"]["query"];
export type CashFlowPulseParams =
  operations["get-cash-flow-pulse"]["parameters"]["query"];
export type BurnRateParams = operations["get-burn-rate"]["parameters"]["query"];
export type BudgetHealthParams =
  operations["get-budget-health"]["parameters"]["query"];

/**
 * Account Statistics API client for analytics and insights endpoints
 */
export class AccountStatisticsAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get comprehensive account statistics
   * Returns all statistics including category heatmap, monthly velocity,
   * time frequency distribution, cash flow pulse, burn rate, and budget health
   */
  async getAccountStatistics(
    accountId: number,
    params?: AccountStatisticsParams,
  ): Promise<APIResponse<AccountStatisticsResponse>> {
    return this.get<AccountStatisticsResponse>(
      `/accounts/${accountId}/statistics`,
      params,
    );
  }

  /**
   * Get category spending heatmap
   * Returns spending distribution by category for the specified time period
   */
  async getCategoryHeatmap(
    accountId: number,
    params?: CategoryHeatmapParams,
  ): Promise<APIResponse<AccountStatisticsCategoryHeatmapModel>> {
    return this.get<AccountStatisticsCategoryHeatmapModel>(
      `/accounts/${accountId}/statistics/category-heatmap`,
      params,
    );
  }

  /**
   * Get monthly spending velocity
   * Returns month-over-month spending trends and velocity metrics
   */
  async getMonthlyVelocity(
    accountId: number,
    params?: MonthlyVelocityParams,
  ): Promise<APIResponse<AccountStatisticsMonthlyVelocityModel>> {
    return this.get<AccountStatisticsMonthlyVelocityModel>(
      `/accounts/${accountId}/statistics/monthly-velocity`,
      params,
    );
  }

  /**
   * Get transaction time frequency distribution
   * Returns frequency distribution of transactions (daily, weekly, monthly, irregular)
   */
  async getTimeFrequencyHeatmap(
    accountId: number,
    params?: TimeFrequencyParams,
  ): Promise<APIResponse<AccountStatisticsTimeFrequencyHeatmapModel>> {
    return this.get<AccountStatisticsTimeFrequencyHeatmapModel>(
      `/accounts/${accountId}/statistics/time-frequency`,
      params,
    );
  }

  /**
   * Get cash flow balance trend
   * Returns daily balance trend over the specified period for visualizing cash flow patterns
   */
  async getCashFlowPulse(
    accountId: number,
    params?: CashFlowPulseParams,
  ): Promise<APIResponse<AccountStatisticsCashFlowPulseModel>> {
    return this.get<AccountStatisticsCashFlowPulseModel>(
      `/accounts/${accountId}/statistics/cash-flow-pulse`,
      params,
    );
  }

  /**
   * Get spending burn rate analysis
   * Returns daily/weekly/monthly average spending and budget projection estimates
   */
  async getBurnRate(
    accountId: number,
    params?: BurnRateParams,
  ): Promise<APIResponse<AccountStatisticsBurnRateModel>> {
    return this.get<AccountStatisticsBurnRateModel>(
      `/accounts/${accountId}/statistics/burn-rate`,
      params,
    );
  }

  /**
   * Get budget health metrics
   * Returns health status of active and past budgets for this account
   */
  async getBudgetHealth(
    accountId: number,
    params?: BudgetHealthParams,
  ): Promise<APIResponse<AccountStatisticsBudgetHealthModel>> {
    return this.get<AccountStatisticsBudgetHealthModel>(
      `/accounts/${accountId}/statistics/budget-health`,
      params,
    );
  }
}

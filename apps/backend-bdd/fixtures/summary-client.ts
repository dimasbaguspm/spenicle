import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Summary types from OpenAPI schemas
 */
export type SummaryAccountSchema =
  components["schemas"]["SummaryAccountSchema"];
export type SummaryAccountModel = components["schemas"]["SummaryAccountModel"];
export type SummaryCategorySchema =
  components["schemas"]["SummaryCategorySchema"];
export type SummaryCategoryModel =
  components["schemas"]["SummaryCategoryModel"];
export type SummaryTagSchema = components["schemas"]["SummaryTagSchema"];
export type SummaryTagItem = components["schemas"]["SummaryTagitem"];
export type SummaryTransactionSchema =
  components["schemas"]["SummaryTransactionSchema"];
export type SummaryTransactionItem =
  components["schemas"]["SummaryTransactionItem"];
export type TotalSummarySchema = components["schemas"]["TotalSummarySchema"];

/**
 * Query parameter types
 */
export type AccountSummaryParams =
  operations["get-account-summary"]["parameters"]["query"];
export type AccountTrendsParams =
  operations["get-account-trends"]["parameters"]["query"];
export type CategorySummaryParams =
  operations["get-category-summary"]["parameters"]["query"];
export type CategoryTrendsParams =
  operations["get-category-trends"]["parameters"]["query"];
export type TagSummaryParams =
  operations["get-tag-summary"]["parameters"]["query"];
export type TotalSummaryParams =
  operations["get-total-summary"]["parameters"]["query"];
export type TransactionSummaryParams =
  operations["get-transaction-summary"]["parameters"]["query"];

/**
 * Trend types
 */
export type AccountTrendSchema = components["schemas"]["AccountTrendSchema"];
export type CategoryTrendSchema = components["schemas"]["CategoryTrendSchema"];

/**
 * Summary API client for analytics and aggregation endpoints
 */
export class SummaryAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get account summary with date filtering
   * Returns summary data grouped by account
   */
  async getAccountSummary(
    params: AccountSummaryParams
  ): Promise<APIResponse<SummaryAccountSchema>> {
    return this.get<SummaryAccountSchema>("/summary/accounts", params);
  }

  /**
   * Get account trends with weekly or monthly frequency
   * Returns trend data for accounts over time
   */
  async getAccountTrends(
    params: AccountTrendsParams
  ): Promise<APIResponse<AccountTrendSchema>> {
    return this.get<AccountTrendSchema>("/summary/accounts/trends", params);
  }

  /**
   * Get category summary with date filtering
   * Returns summary data grouped by category
   */
  async getCategorySummary(
    params: CategorySummaryParams
  ): Promise<APIResponse<SummaryCategorySchema>> {
    return this.get<SummaryCategorySchema>("/summary/categories", params);
  }

  /**
   * Get category trends with weekly or monthly frequency
   * Returns trend data for categories over time
   */
  async getCategoryTrends(
    params: CategoryTrendsParams
  ): Promise<APIResponse<CategoryTrendSchema>> {
    return this.get<CategoryTrendSchema>("/summary/categories/trends", params);
  }

  /**
   * Get tag summary with optional filtering
   * Supports filtering by date, type, accounts, categories, and tag names
   */
  async getTagSummary(
    params?: TagSummaryParams
  ): Promise<APIResponse<SummaryTagSchema>> {
    return this.get<SummaryTagSchema>("/summary/tags", params);
  }

  /**
   * Get total summary with optional date filtering
   * Returns overall transaction counts and totals by type
   */
  async getTotalSummary(
    params?: TotalSummaryParams
  ): Promise<APIResponse<TotalSummarySchema>> {
    return this.get<TotalSummarySchema>("/summary/total", params);
  }

  /**
   * Get transaction summary grouped by period
   * Supports daily, weekly, monthly, or yearly frequency
   */
  async getTransactionSummary(
    params: TransactionSummaryParams
  ): Promise<APIResponse<SummaryTransactionSchema>> {
    return this.get<SummaryTransactionSchema>("/summary/transactions", params);
  }
}

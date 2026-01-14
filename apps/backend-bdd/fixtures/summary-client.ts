import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Summary types from OpenAPI schemas
 */
export type SummaryAccountResponseModel =
  components["schemas"]["SummaryAccountResponseModel"];
export type SummaryCategoryResponseModel =
  components["schemas"]["SummaryCategoryResponseModel"];
export type SummaryTransactionResponseModel =
  components["schemas"]["SummaryTransactionResponseModel"];

/**
 * Query parameter types
 */
export type AccountSummaryParams =
  operations["get-account-summary"]["parameters"]["query"];
export type CategorySummaryParams =
  operations["get-category-summary"]["parameters"]["query"];
export type TransactionSummaryParams =
  operations["get-transaction-summary"]["parameters"]["query"];

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
  ): Promise<APIResponse<SummaryAccountResponseModel>> {
    return this.get<SummaryAccountResponseModel>("/summary/accounts", params);
  }

  /**
   * Get category summary with date filtering
   * Returns summary data grouped by category
   */
  async getCategorySummary(
    params: CategorySummaryParams
  ): Promise<APIResponse<SummaryCategoryResponseModel>> {
    return this.get<SummaryCategoryResponseModel>(
      "/summary/categories",
      params
    );
  }

  /**
   * Get transaction summary grouped by period
   * Supports daily, weekly, monthly, or yearly frequency
   */
  async getTransactionSummary(
    params: TransactionSummaryParams
  ): Promise<APIResponse<SummaryTransactionResponseModel>> {
    return this.get<SummaryTransactionResponseModel>(
      "/summary/transactions",
      params
    );
  }
}

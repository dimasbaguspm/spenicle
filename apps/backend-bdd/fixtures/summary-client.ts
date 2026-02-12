import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Summary types from OpenAPI schemas
 */
export type SummaryAccountResponseModel =
  components["schemas"]["SummaryAccountListModel"];
export type SummaryCategoryResponseModel =
  components["schemas"]["SummaryCategoryListModel"];
export type SummaryTransactionResponseModel =
  components["schemas"]["SummaryTransactionListModel"];
export type SummaryGeospatialResponseModel =
  components["schemas"]["SummaryGeospatialListModel"];

/**
 * Query parameter types
 */
export type AccountSummaryParams =
  operations["get-account-summary"]["parameters"]["query"];
export type CategorySummaryParams =
  operations["get-category-summary"]["parameters"]["query"];
export type TransactionSummaryParams =
  operations["get-transaction-summary"]["parameters"]["query"];
export type GeospatialSummaryParams =
  operations["get-geospatial-summary"]["parameters"]["query"];

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

  /**
   * Get geospatial transaction aggregation
   * Returns transactions aggregated by geographic grid cells within a radius
   */
  async getGeospatialSummary(
    params: GeospatialSummaryParams
  ): Promise<APIResponse<SummaryGeospatialResponseModel>> {
    return this.get<SummaryGeospatialResponseModel>(
      "/summary/geospatial",
      params
    );
  }
}

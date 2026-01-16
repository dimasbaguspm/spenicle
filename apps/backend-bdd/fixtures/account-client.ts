import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Account types from OpenAPI operations
 */
export type AccountModel = components["schemas"]["AccountModel"];
export type AccountSearchSchema =
  operations["list-accounts"]["parameters"]["query"];
export type CreateAccountRequestModel =
  components["schemas"]["CreateAccountModel"];
export type UpdateAccountRequestModel =
  components["schemas"]["UpdateAccountModel"];
export type AccountReorderRequestModel =
  components["schemas"]["ReorderAccountsModel"];
export type PaginatedAccountResponseModel =
  components["schemas"]["AccountsPagedModel"];

/**
 * Account API client
 */
export class AccountAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get all accounts with optional filters
   */
  async getAccounts(
    params?: AccountSearchSchema
  ): Promise<APIResponse<PaginatedAccountResponseModel>> {
    return this.get<PaginatedAccountResponseModel>("/accounts", params);
  }

  /**
   * Get a single account by ID
   */
  async getAccount(id: number): Promise<APIResponse<AccountModel>> {
    return this.get<AccountModel>(`/accounts/${id}`);
  }

  /**
   * Create a new account
   */
  async createAccount(
    data: CreateAccountRequestModel
  ): Promise<APIResponse<AccountModel>> {
    return this.post<AccountModel>("/accounts", data);
  }

  /**
   * Update an existing account
   */
  async updateAccount(
    id: number,
    data: UpdateAccountRequestModel
  ): Promise<APIResponse<AccountModel>> {
    return this.patch<AccountModel>(`/accounts/${id}`, data);
  }

  /**
   * Delete an account
   */
  async deleteAccount(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/accounts/${id}`);
  }

  /**
   * Reorder accounts
   */
  async reorderAccounts(
    data: AccountReorderRequestModel
  ): Promise<APIResponse<void>> {
    return this.post<void>("/accounts/reorder", data);
  }

  /**
   * Archive an account
   */
  async archiveAccount(id: number): Promise<APIResponse<AccountModel>> {
    return this.updateAccount(id, { archivedAt: new Date().toISOString() });
  }

  /**
   * Unarchive an account
   */
  async unarchiveAccount(id: number): Promise<APIResponse<AccountModel>> {
    return this.updateAccount(id, { archivedAt: "" });
  }
}

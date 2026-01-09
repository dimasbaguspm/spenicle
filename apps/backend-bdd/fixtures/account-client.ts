import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type {
  TestContext,
  APIResponse,
  PaginatedResponse,
} from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Account types from OpenAPI operations
 */
export type AccountSchema = components["schemas"]["AccountSchema"];
export type AccountSearchSchema =
  operations["list-accounts"]["parameters"]["query"];
export type CreateAccountSchema = components["schemas"]["CreateAccountSchema"];
export type UpdateAccountSchema = components["schemas"]["UpdateAccountSchema"];
export type AccountReorderSchema =
  components["schemas"]["AccountReorderSchema"];
export type PaginatedAccountSchema =
  components["schemas"]["PaginatedAccountSchema"];

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
  ): Promise<APIResponse<PaginatedAccountSchema>> {
    return this.get<PaginatedAccountSchema>("/accounts", params);
  }

  /**
   * Get a single account by ID
   */
  async getAccount(id: number): Promise<APIResponse<AccountSchema>> {
    return this.get<AccountSchema>(`/accounts/${id}`);
  }

  /**
   * Create a new account
   */
  async createAccount(
    data: CreateAccountSchema
  ): Promise<APIResponse<AccountSchema>> {
    return this.post<AccountSchema>("/accounts", data);
  }

  /**
   * Update an existing account
   */
  async updateAccount(
    id: number,
    data: UpdateAccountSchema
  ): Promise<APIResponse<AccountSchema>> {
    return this.patch<AccountSchema>(`/accounts/${id}`, data);
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
    data: AccountReorderSchema
  ): Promise<APIResponse<void>> {
    return this.post<void>("/accounts/reorder", data);
  }

  /**
   * Archive an account
   */
  async archiveAccount(id: number): Promise<APIResponse<AccountSchema>> {
    return this.updateAccount(id, { archivedAt: new Date().toISOString() });
  }

  /**
   * Unarchive an account
   */
  async unarchiveAccount(id: number): Promise<APIResponse<AccountSchema>> {
    return this.updateAccount(id, { archivedAt: null as any });
  }
}

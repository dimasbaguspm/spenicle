import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Budget types from OpenAPI schemas
 */
export type BudgetSchema = components["schemas"]["BudgetSchema"];
export type CreateBudgetSchema = components["schemas"]["CreateBudgetSchema"];
export type UpdateBudgetSchema = components["schemas"]["UpdateBudgetSchema"];
export type PaginatedBudgetSchema =
  components["schemas"]["PaginatedBudgetSchema"];

/**
 * Query parameter types
 */
export type ListBudgetsParams =
  operations["list-budgets"]["parameters"]["query"];
export type ListAccountBudgetsParams =
  operations["list-account-budgets"]["parameters"]["query"];
export type ListCategoryBudgetsParams =
  operations["list-category-budgets"]["parameters"]["query"];

/**
 * Budget API client for managing budgets
 */
export class BudgetAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get all budgets with pagination
   */
  async getBudgets(
    params?: ListBudgetsParams
  ): Promise<APIResponse<PaginatedBudgetSchema>> {
    return this.get<PaginatedBudgetSchema>("/budgets", params);
  }

  /**
   * Get a single budget by ID
   */
  async getBudget(id: number): Promise<APIResponse<BudgetSchema>> {
    return this.get<BudgetSchema>(`/budgets/${id}`);
  }

  /**
   * Create a new budget
   */
  async createBudget(
    data: CreateBudgetSchema
  ): Promise<APIResponse<BudgetSchema>> {
    return this.post<BudgetSchema>("/budgets", data);
  }

  /**
   * Update an existing budget
   */
  async updateBudget(
    id: number,
    data: UpdateBudgetSchema
  ): Promise<APIResponse<BudgetSchema>> {
    return this.patch<BudgetSchema>(`/budgets/${id}`, data);
  }

  /**
   * Delete a budget
   */
  async deleteBudget(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/budgets/${id}`);
  }

  /**
   * Get all budgets for a specific account
   */
  async getAccountBudgets(
    accountId: number,
    params?: ListAccountBudgetsParams
  ): Promise<APIResponse<PaginatedBudgetSchema>> {
    return this.get<PaginatedBudgetSchema>(
      `/accounts/${accountId}/budgets`,
      params
    );
  }

  /**
   * Get a specific budget for an account
   */
  async getAccountBudget(
    accountId: number,
    budgetId: number
  ): Promise<APIResponse<BudgetSchema>> {
    return this.get<BudgetSchema>(`/accounts/${accountId}/budgets/${budgetId}`);
  }

  /**
   * Get all budgets for a specific category
   */
  async getCategoryBudgets(
    categoryId: number,
    params?: ListCategoryBudgetsParams
  ): Promise<APIResponse<PaginatedBudgetSchema>> {
    return this.get<PaginatedBudgetSchema>(
      `/categories/${categoryId}/budgets`,
      params
    );
  }

  /**
   * Get a specific budget for a category
   */
  async getCategoryBudget(
    categoryId: number,
    budgetId: number
  ): Promise<APIResponse<BudgetSchema>> {
    return this.get<BudgetSchema>(
      `/categories/${categoryId}/budgets/${budgetId}`
    );
  }
}

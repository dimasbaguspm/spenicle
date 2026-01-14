import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Budget types from OpenAPI schemas
 */
export type BudgetModel = components["schemas"]["BudgetModel"];
export type CreateBudgetRequestModel =
  components["schemas"]["CreateBudgetRequestModel"];
export type UpdateBudgetRequestModel =
  components["schemas"]["UpdateBudgetRequestModel"];
export type PaginatedBudgetResponseModel =
  components["schemas"]["ListBudgetsResponseModel"];

/**
 * Query parameter types
 */
export type ListBudgetsParams =
  operations["list-budgets"]["parameters"]["query"];

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
  ): Promise<APIResponse<PaginatedBudgetResponseModel>> {
    return this.get<PaginatedBudgetResponseModel>("/budgets", params);
  }

  /**
   * Get a single budget by ID
   */
  async getBudget(id: number): Promise<APIResponse<BudgetModel>> {
    return this.get<BudgetModel>(`/budgets/${id}`);
  }

  /**
   * Create a new budget
   */
  async createBudget(
    data: CreateBudgetRequestModel
  ): Promise<APIResponse<BudgetModel>> {
    return this.post<BudgetModel>("/budgets", data);
  }

  /**
   * Update an existing budget
   */
  async updateBudget(
    id: number,
    data: UpdateBudgetRequestModel
  ): Promise<APIResponse<BudgetModel>> {
    return this.patch<BudgetModel>(`/budgets/${id}`, data);
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
    params?: ListBudgetsParams
  ): Promise<APIResponse<PaginatedBudgetResponseModel>> {
    return this.get<PaginatedBudgetResponseModel>(
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
  ): Promise<APIResponse<BudgetModel>> {
    return this.get<BudgetModel>(`/accounts/${accountId}/budgets/${budgetId}`);
  }

  /**
   * Get all budgets for a specific category
   */
  async getCategoryBudgets(
    categoryId: number,
    params?: ListBudgetsParams
  ): Promise<APIResponse<PaginatedBudgetResponseModel>> {
    return this.get<PaginatedBudgetResponseModel>(
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
  ): Promise<APIResponse<BudgetModel>> {
    return this.get<BudgetModel>(
      `/categories/${categoryId}/budgets/${budgetId}`
    );
  }
}

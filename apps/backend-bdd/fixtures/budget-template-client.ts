import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Budget template types from OpenAPI
 */
export type BudgetTemplateModel = components["schemas"]["BudgetTemplateModel"];
export type CreateBudgetTemplateRequestModel =
  components["schemas"]["CreateBudgetTemplateModel"];
export type UpdateBudgetTemplateRequestModel =
  components["schemas"]["UpdateBudgetTemplateModel"];
export type PaginatedBudgetTemplatesResponseModel =
  components["schemas"]["BudgetTemplatesPagedModel"];

export type BudgetTemplateSearchParams =
  operations["list-budget-templates"]["parameters"]["query"];

export class BudgetTemplateAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  async getBudgetTemplates(
    params?: BudgetTemplateSearchParams
  ): Promise<APIResponse<PaginatedBudgetTemplatesResponseModel>> {
    return this.get<PaginatedBudgetTemplatesResponseModel>(
      "/budgets/templates",
      params
    );
  }

  async getBudgetTemplate(
    id: number
  ): Promise<APIResponse<BudgetTemplateModel>> {
    return this.get<BudgetTemplateModel>(`/budgets/templates/${id}`);
  }

  async createBudgetTemplate(
    data: CreateBudgetTemplateRequestModel
  ): Promise<APIResponse<BudgetTemplateModel>> {
    return this.post<BudgetTemplateModel>("/budgets/templates", data);
  }

  async updateBudgetTemplate(
    id: number,
    data: UpdateBudgetTemplateRequestModel
  ): Promise<APIResponse<BudgetTemplateModel>> {
    return this.patch<BudgetTemplateModel>(`/budgets/templates/${id}`, data);
  }

  async deleteBudgetTemplate(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/budgets/templates/${id}`);
  }
}

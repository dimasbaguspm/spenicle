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

export type BudgetTemplateRelatedBudgetsSearchParams =
  operations["list-budget-template-related-budgets"]["parameters"]["query"];

export type PaginatedBudgetsResponseModel =
  components["schemas"]["BudgetsPagedModel"];

export type BudgetModel = components["schemas"]["BudgetModel"];
export type UpdateBudgetRequestModel =
  components["schemas"]["UpdateBudgetRequestModel"];

export class BudgetTemplateAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  async getBudgetTemplates(
    params?: BudgetTemplateSearchParams,
  ): Promise<APIResponse<PaginatedBudgetTemplatesResponseModel>> {
    return this.get<PaginatedBudgetTemplatesResponseModel>("/budgets", params);
  }

  async getBudgetTemplate(
    id: number,
  ): Promise<APIResponse<BudgetTemplateModel>> {
    return this.get<BudgetTemplateModel>(`/budgets/${id}`);
  }

  async createBudgetTemplate(
    data: CreateBudgetTemplateRequestModel,
  ): Promise<APIResponse<BudgetTemplateModel>> {
    return this.post<BudgetTemplateModel>("/budgets", data);
  }

  async updateBudgetTemplate(
    id: number,
    data: UpdateBudgetTemplateRequestModel,
  ): Promise<APIResponse<BudgetTemplateModel>> {
    return this.patch<BudgetTemplateModel>(`/budgets/${id}`, data);
  }

  async getBudgetTemplateRelatedBudgets(
    templateId: number,
    params?: BudgetTemplateRelatedBudgetsSearchParams,
  ): Promise<APIResponse<PaginatedBudgetsResponseModel>> {
    return this.get<PaginatedBudgetsResponseModel>(
      `/budgets/${templateId}/list`,
      params,
    );
  }

  /**
   * Update an individual budget's amount limit
   * PATCH /budgets/{template_id}/list/{budget_id}
   * Only affects the specific budget, NOT the template or future budgets
   */
  async updateBudgetFromTemplate(
    templateId: number,
    budgetId: number,
    data: UpdateBudgetRequestModel,
  ): Promise<APIResponse<BudgetModel>> {
    return this.patch<BudgetModel>(
      `/budgets/${templateId}/list/${budgetId}`,
      data,
    );
  }
}

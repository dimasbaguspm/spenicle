import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Transaction template types from OpenAPI
 */
export type TransactionTemplateModel =
  components["schemas"]["TransactionTemplateModel"];
export type CreateTransactionTemplateRequestModel =
  components["schemas"]["CreateTransactionTemplateModel"];
export type UpdateTransactionTemplateRequestModel =
  components["schemas"]["UpdateTransactionTemplateModel"];
export type PaginatedTransactionTemplatesResponseModel =
  components["schemas"]["TransactionTemplatesPagedModel"];

export type TransactionTemplateSearchParams =
  operations["list-transaction-templates"]["parameters"]["query"];

export class TransactionTemplateAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  async getTransactionTemplates(
    params?: TransactionTemplateSearchParams
  ): Promise<APIResponse<PaginatedTransactionTemplatesResponseModel>> {
    return this.get<PaginatedTransactionTemplatesResponseModel>(
      "/transaction-templates",
      params
    );
  }

  async getTransactionTemplate(
    id: number
  ): Promise<APIResponse<TransactionTemplateModel>> {
    return this.get<TransactionTemplateModel>(`/transaction-templates/${id}`);
  }

  async createTransactionTemplate(
    data: CreateTransactionTemplateRequestModel
  ): Promise<APIResponse<TransactionTemplateModel>> {
    return this.post<TransactionTemplateModel>("/transaction-templates", data);
  }

  async updateTransactionTemplate(
    id: number,
    data: UpdateTransactionTemplateRequestModel
  ): Promise<APIResponse<TransactionTemplateModel>> {
    return this.patch<TransactionTemplateModel>(
      `/transaction-templates/${id}`,
      data
    );
  }

  async deleteTransactionTemplate(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/transaction-templates/${id}`);
  }
}

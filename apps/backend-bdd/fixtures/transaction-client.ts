import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Transaction types from OpenAPI operations
 */
export type TransactionModel = components["schemas"]["TransactionModel"];
export type TransactionSearchSchema =
  operations["list-transactions"]["parameters"]["query"];
export type CreateTransactionRequestModel =
  components["schemas"]["CreateTransactionModel"];
export type UpdateTransactionRequestModel =
  components["schemas"]["UpdateTransactionModel"];
export type PaginatedTransactionResponseModel =
  components["schemas"]["TransactionsPagedModel"];
export type TransactionTagModel = components["schemas"]["TransactionTagModel"];
export type TransactionTagRequestModel =
  components["schemas"]["TransactionTagModel"];
export type TransactionRelationsPagedModel =
  components["schemas"]["TransactionRelationsPagedModel"];
export type TransactionRelationModel =
  components["schemas"]["TransactionRelationModel"];

export type BulkTransactionUpdateItemModel =
  components["schemas"]["BulkTransactionUpdateItemModel"];
export type BulkTransactionDraftModel =
  components["schemas"]["BulkTransactionDraftModel"];
export type BulkTransactionDraftResponseModel =
  components["schemas"]["BulkTransactionDraftResponseModel"];
export type BulkTransactionCommitResponseModel =
  components["schemas"]["BulkTransactionCommitResponseModel"];
/**
 * Transaction API client
 */
export class TransactionAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get all transactions with optional filters
   */
  async getTransactions(
    params?: TransactionSearchSchema,
  ): Promise<APIResponse<PaginatedTransactionResponseModel>> {
    return this.get<PaginatedTransactionResponseModel>("/transactions", params);
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: number): Promise<APIResponse<TransactionModel>> {
    return this.get<TransactionModel>(`/transactions/${id}`);
  }

  /**
   * Create a new transaction
   */
  async createTransaction(
    data: CreateTransactionRequestModel,
  ): Promise<APIResponse<TransactionModel>> {
    return this.post<TransactionModel>("/transactions", data);
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: number,
    data: UpdateTransactionRequestModel,
  ): Promise<APIResponse<TransactionModel>> {
    return this.patch<TransactionModel>(`/transactions/${id}`, data);
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/transactions/${id}`);
  }

  /**
   * Get transaction tags
   */
  async getTransactionTags(
    id: number,
  ): Promise<APIResponse<components["schemas"]["TransactionTagsPagedModel"]>> {
    return this.get<components["schemas"]["TransactionTagsPagedModel"]>(
      `/transactions/${id}/tags`,
    );
  }

  /**
   * Add tag to transaction
   */
  async addTransactionTag(
    id: number,
    tagId: number,
  ): Promise<APIResponse<void>> {
    return this.post<void>(`/transactions/${id}/tags`, {
      tagId: tagId,
      transactionId: id,
    });
  }

  /**
   * Update transaction tags
   */
  async updateTransactionTags(
    id: number,
    tagIds: string[],
  ): Promise<APIResponse<void>> {
    return this.put<void>(`/transactions/${id}/tags`, { tagIds });
  }

  /**
   * Remove a tag from a transaction
   */
  async removeTransactionTag(
    transactionId: number,
    tagId: number,
  ): Promise<APIResponse<void>> {
    return this.delete<void>(`/transactions/${transactionId}/tags/${tagId}`);
  }

  /**
   * Get transaction relations
   */
  async getTransactionRelations(
    id: number,
  ): Promise<APIResponse<TransactionRelationsPagedModel>> {
    return this.get<TransactionRelationsPagedModel>(
      `/transactions/${id}/relations`,
    );
  }

  /**
   * Create transaction relation
   */
  async createTransactionRelation(
    sourceId: number,
    relatedTransactionId: number,
    relationType: string,
  ): Promise<APIResponse<TransactionRelationModel>> {
    return this.post<TransactionRelationModel>(
      `/transactions/${sourceId}/relations`,
      {
        SourceTransactionID: sourceId,
        relatedTransactionId,
        relationType,
      },
    );
  }

  /**
   * Delete transaction relation
   */
  async deleteTransactionRelation(
    id: number,
    relatedId: number,
  ): Promise<APIResponse<void>> {
    return this.delete<void>(`/transactions/${id}/relations/${relatedId}`);
  }

  /**
   * Link transaction to template
   */
  async linkTransactionToTemplate(
    transactionId: number,
    templateId: number,
  ): Promise<APIResponse<void>> {
    return this.post<void>(`/transactions/${transactionId}/link-template`, {
      templateId,
    });
  }

  /**
   * Save bulk transaction draft
   */
  async saveBulkDraft(data: {
    updates: BulkTransactionUpdateItemModel[];
  }): Promise<APIResponse<BulkTransactionDraftResponseModel>> {
    return this.patch<BulkTransactionDraftResponseModel>(
      "/transactions/bulk/draft",
      data,
    );
  }

  /**
   * Get bulk transaction draft
   */
  async getBulkDraft(): Promise<APIResponse<BulkTransactionDraftModel>> {
    return this.get<BulkTransactionDraftModel>("/transactions/bulk/draft");
  }

  /**
   * Commit bulk transaction draft
   */
  async commitBulkDraft(): Promise<
    APIResponse<BulkTransactionCommitResponseModel>
  > {
    return this.post<BulkTransactionCommitResponseModel>(
      "/transactions/bulk/draft/commit",
      {},
    );
  }

  /**
   * Delete bulk transaction draft
   */
  async deleteBulkDraft(): Promise<APIResponse<void>> {
    return this.delete<void>("/transactions/bulk/draft");
  }
}

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
  components["schemas"]["CreateTransactionRequestModel"];
export type UpdateTransactionRequestModel =
  components["schemas"]["UpdateTransactionRequestModel"];
export type ListTransactionsResponseModel =
  components["schemas"]["ListTransactionsResponseModel"];
export type TransactionTagModel = components["schemas"]["TransactionTagModel"];
export type CreateTransactionTagRequestModel =
  components["schemas"]["CreateTransactionTagRequestModel"];
export type ListTransactionTagsResponseModel =
  components["schemas"]["ListTransactionTagsResponseModel"];

type TransactionTag = components["schemas"]["TransactionTagModel"];
type TransactionRelationCreateSchema =
  components["schemas"]["TransactionRelationModel"];
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
    params?: TransactionSearchSchema
  ): Promise<APIResponse<ListTransactionsResponseModel>> {
    return this.get<ListTransactionsResponseModel>("/transactions", params);
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
    data: CreateTransactionRequestModel
  ): Promise<APIResponse<TransactionModel>> {
    return this.post<TransactionModel>("/transactions", data);
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: number,
    data: UpdateTransactionRequestModel
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
  async getTransactionTags(id: number): Promise<APIResponse<TransactionTag>> {
    return this.get<any>(`/transactions/${id}/tags`);
  }

  /**
   * Add tag to transaction
   */
  async addTransactionTag(
    id: number,
    tagName: string
  ): Promise<APIResponse<void>> {
    return this.post<void>(`/transactions/${id}/tags`, { tagName });
  }

  /**
   * Update transaction tags
   */
  async updateTransactionTags(
    id: number,
    tagIds: string[]
  ): Promise<APIResponse<void>> {
    return this.put<void>(`/transactions/${id}/tags`, { tagIds });
  }

  /**
   * Get transaction relations
   */
  async getTransactionRelations(
    id: number
  ): Promise<APIResponse<TransactionModel[]>> {
    return this.get<any>(`/transactions/${id}/relations`);
  }

  /**
   * Create transaction relation
   */
  async createTransactionRelation(
    id: number,
    relatedTransactionId: number
  ): Promise<APIResponse<TransactionRelationCreateSchema>> {
    return this.post<any>(`/transactions/${id}/relations`, {
      relatedTransactionId,
    });
  }

  /**
   * Delete transaction relation
   */
  async deleteTransactionRelation(
    id: number,
    relatedId: number
  ): Promise<APIResponse<void>> {
    return this.delete<void>(`/transactions/${id}/relations/${relatedId}`);
  }
}

import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type {
  TestContext,
  APIResponse,
  PaginatedResponse,
} from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Transaction types from OpenAPI operations
 */
export type TransactionSchema = components["schemas"]["TransactionSchema"];
export type TransactionSearchSchema =
  operations["list-transactions"]["parameters"]["query"];
export type CreateTransactionSchema =
  components["schemas"]["CreateTransactionSchema"];
export type UpdateTransactionSchema =
  components["schemas"]["UpdateTransactionSchema"];
export type PaginatedTransactionSchema =
  components["schemas"]["PaginatedTransactionSchema"];
export type TransactionTagsSchema =
  components["schemas"]["TransactionTagsSchema"];
export type AddTransactionTagSchema =
  components["schemas"]["AddTransactionTagSchema"];
export type UpdateTransactionTagsSchema =
  components["schemas"]["UpdateTransactionTagsSchema"];

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
  ): Promise<APIResponse<PaginatedTransactionSchema>> {
    return this.get<PaginatedTransactionSchema>("/transactions", params);
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: number): Promise<APIResponse<TransactionSchema>> {
    return this.get<TransactionSchema>(`/transactions/${id}`);
  }

  /**
   * Create a new transaction
   */
  async createTransaction(
    data: CreateTransactionSchema
  ): Promise<APIResponse<TransactionSchema>> {
    return this.post<TransactionSchema>("/transactions", data);
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    id: number,
    data: UpdateTransactionSchema
  ): Promise<APIResponse<TransactionSchema>> {
    return this.patch<TransactionSchema>(`/transactions/${id}`, data);
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
  async getTransactionTags(id: number): Promise<APIResponse<any>> {
    return this.get<any>(`/transactions/${id}/tags`);
  }

  /**
   * Add tag to transaction
   */
  async addTransactionTag(
    id: number,
    tagName: string
  ): Promise<APIResponse<any>> {
    return this.post<any>(`/transactions/${id}/tags`, { tagName });
  }

  /**
   * Update transaction tags
   */
  async updateTransactionTags(
    id: number,
    tagIds: string[]
  ): Promise<APIResponse<any>> {
    return this.put<any>(`/transactions/${id}/tags`, { tagIds });
  }

  /**
   * Get transaction relations
   */
  async getTransactionRelations(id: number): Promise<APIResponse<any>> {
    return this.get<any>(`/transactions/${id}/relations`);
  }

  /**
   * Create transaction relation
   */
  async createTransactionRelation(
    id: number,
    relatedTransactionId: number
  ): Promise<APIResponse<any>> {
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

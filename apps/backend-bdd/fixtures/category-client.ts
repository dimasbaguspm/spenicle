import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Category types from OpenAPI operations
 */
export type CategorySchema = components["schemas"]["CategorySchema"];
export type CategorySearchSchema =
  operations["list-categories"]["parameters"]["query"];
export type CreateCategorySchema =
  components["schemas"]["CreateCategorySchema"];
export type UpdateCategorySchema =
  components["schemas"]["UpdateCategorySchema"];
export type CategoryReorderSchema =
  components["schemas"]["CategoryReorderSchema"];
export type PaginatedCategorySchema =
  components["schemas"]["PaginatedCategorySchema"];

/**
 * Category API client
 */
export class CategoryAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get all categories with optional filters
   */
  async getCategories(
    params?: CategorySearchSchema
  ): Promise<APIResponse<PaginatedCategorySchema>> {
    return this.get<PaginatedCategorySchema>("/categories", params);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<APIResponse<CategorySchema>> {
    return this.get<CategorySchema>(`/categories/${id}`);
  }

  /**
   * Create a new category
   */
  async createCategory(
    data: CreateCategorySchema
  ): Promise<APIResponse<CategorySchema>> {
    return this.post<CategorySchema>("/categories", data);
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: number,
    data: UpdateCategorySchema
  ): Promise<APIResponse<CategorySchema>> {
    return this.patch<CategorySchema>(`/categories/${id}`, data);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/categories/${id}`);
  }

  /**
   * Reorder categories
   */
  async reorderCategories(
    data: CategoryReorderSchema
  ): Promise<APIResponse<void>> {
    return this.post<void>("/categories/reorder", data);
  }

  /**
   * Archive a category
   */
  async archiveCategory(id: number): Promise<APIResponse<CategorySchema>> {
    return this.updateCategory(id, { archivedAt: new Date().toISOString() });
  }

  /**
   * Unarchive a category
   */
  async unarchiveCategory(id: number): Promise<APIResponse<CategorySchema>> {
    return this.updateCategory(id, { archivedAt: null as any });
  }
}

import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Category types from OpenAPI operations
 */
export type CategoryModel = components["schemas"]["CategoryModel"];
export type CategorySearchSchema =
  operations["list-categories"]["parameters"]["query"];
export type CreateCategoryRequestModel =
  components["schemas"]["CreateCategoryModel"];
export type UpdateCategoryRequestModel =
  components["schemas"]["UpdateCategoryModel"];
export type CategoryReorderRequestModel =
  components["schemas"]["ReorderCategoriesModel"];
export type PaginatedCategoryResponseModel =
  components["schemas"]["CategoriesPagedModel"];

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
  ): Promise<APIResponse<PaginatedCategoryResponseModel>> {
    return this.get<PaginatedCategoryResponseModel>("/categories", params);
  }

  /**
   * Get a single category by ID
   */
  async getCategory(id: number): Promise<APIResponse<CategoryModel>> {
    return this.get<CategoryModel>(`/categories/${id}`);
  }

  /**
   * Create a new category
   */
  async createCategory(
    data: CreateCategoryRequestModel
  ): Promise<APIResponse<CategoryModel>> {
    return this.post<CategoryModel>("/categories", data);
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    id: number,
    data: UpdateCategoryRequestModel
  ): Promise<APIResponse<CategoryModel>> {
    return this.patch<CategoryModel>(`/categories/${id}`, data);
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
    data: CategoryReorderRequestModel
  ): Promise<APIResponse<void>> {
    return this.post<void>("/categories/reorder", data);
  }

  /**
   * Archive a category
   */
  async archiveCategory(id: number): Promise<APIResponse<CategoryModel>> {
    return this.updateCategory(id, { archivedAt: new Date().toISOString() });
  }

  /**
   * Unarchive a category
   */
  async unarchiveCategory(id: number): Promise<APIResponse<CategoryModel>> {
    return this.updateCategory(id, { archivedAt: "" });
  }
}

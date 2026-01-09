import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Tag types from OpenAPI operations
 */
export type TagSchema = components["schemas"]["TagSchema"];
export type TagSearchSchema = operations["list-tags"]["parameters"]["query"];
export type CreateTagSchema = components["schemas"]["CreateTagSchema"];
export type PaginatedTagSchema = components["schemas"]["PaginatedTagSchema"];

/**
 * Tag API client
 */
export class TagAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get all tags with optional filters
   */
  async getTags(
    params?: TagSearchSchema
  ): Promise<APIResponse<PaginatedTagSchema>> {
    return this.get<PaginatedTagSchema>("/tags", params);
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagSchema): Promise<APIResponse<TagSchema>> {
    return this.post<TagSchema>("/tags", data);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/tags/${id}`);
  }
}

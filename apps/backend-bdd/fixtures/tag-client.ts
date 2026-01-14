import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { operations, components } from "../types/openapi";

/**
 * Tag types from OpenAPI operations
 */
export type TagModel = components["schemas"]["TagModel"];
export type TagSearchSchema = operations["list-tags"]["parameters"]["query"];
export type CreateTagRequestModel =
  components["schemas"]["CreateTagRequestModel"];
export type PaginatedTagResponseModel =
  components["schemas"]["ListTagsResponseModel"];

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
  ): Promise<APIResponse<PaginatedTagResponseModel>> {
    return this.get<PaginatedTagResponseModel>("/tags", params);
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagRequestModel): Promise<APIResponse<TagModel>> {
    return this.post<TagModel>("/tags", data);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<APIResponse<void>> {
    return this.delete<void>(`/tags/${id}`);
  }
}

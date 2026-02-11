import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type { TestContext, APIResponse } from "../types/common";
import type { components } from "../types/openapi";

/**
 * Preference types from OpenAPI
 */
export type RefreshGeoCacheRequest = components["schemas"]["RefreshGeoCache"];

/**
 * Preference API client for user preference operations
 */
export class PreferenceAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Refresh geolocation cache in background
   * Accepts optional user coordinates to prioritize nearby transactions
   * Returns immediately while indexing happens asynchronously
   */
  async refreshGeoCache(
    data?: RefreshGeoCacheRequest
  ): Promise<APIResponse<void>> {
    // When no data provided, send explicit null values for both fields
    const body = data !== undefined ? data : { latitude: null, longitude: null };
    return this.post<void>("/preferences/refresh-geo-cache", body);
  }
}

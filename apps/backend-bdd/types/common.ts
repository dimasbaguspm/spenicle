/**
 * Type helpers for API testing
 * These types are manually defined based on OpenAPI spec
 * Auto-generated types will be in api.d.ts (generated from openapi.yaml)
 */

/**
 * API Response wrapper
 */
export interface APIResponse<T = unknown> {
  data?: T;
  error?: ErrorModel;
  status: number;
  headers: Record<string, string>;
}

/**
 * Error model from API
 */
export interface ErrorModel {
  title?: string;
  status?: number;
  detail?: string;
  errors?: ErrorDetail[];
}

export interface ErrorDetail {
  location?: string;
  message?: string;
  value?: unknown;
}

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  pageTotal: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Auth tokens
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Test context that carries auth and other shared state
 */
export interface TestContext {
  accessToken?: string;
  refreshToken?: string;
  baseURL: string;
  userId?: string;
}

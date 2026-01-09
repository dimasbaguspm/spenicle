import { test as base, APIRequestContext, expect } from "@playwright/test";
import type { APIResponse, AuthTokens, TestContext } from "../types/common";

/**
 * Base API client with common utilities
 */
export class BaseAPIClient {
  constructor(
    protected request: APIRequestContext,
    protected context: TestContext
  ) {}

  /**
   * Get authorization headers
   */
  protected getAuthHeaders(): Record<string, string> {
    if (this.context.accessToken) {
      return {
        Authorization: `Bearer ${this.context.accessToken}`,
      };
    }
    return {};
  }

  /**
   * Make a GET request
   */
  protected async get<T>(
    path: string,
    params?: Record<string, any>
  ): Promise<APIResponse<T>> {
    const url = new URL(path, this.context.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await this.request.get(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a POST request
   */
  protected async post<T>(path: string, body?: any): Promise<APIResponse<T>> {
    const url = new URL(path, this.context.baseURL);
    const response = await this.request.post(url.toString(), {
      headers: this.getAuthHeaders(),
      data: body,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a PATCH request
   */
  protected async patch<T>(path: string, body?: any): Promise<APIResponse<T>> {
    const url = new URL(path, this.context.baseURL);
    const response = await this.request.patch(url.toString(), {
      headers: this.getAuthHeaders(),
      data: body,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a PUT request
   */
  protected async put<T>(path: string, body?: any): Promise<APIResponse<T>> {
    const url = new URL(path, this.context.baseURL);
    const response = await this.request.put(url.toString(), {
      headers: this.getAuthHeaders(),
      data: body,
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Make a DELETE request
   */
  protected async delete<T>(path: string): Promise<APIResponse<T>> {
    const url = new URL(path, this.context.baseURL);
    const response = await this.request.delete(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    return this.parseResponse<T>(response);
  }

  /**
   * Parse API response
   */
  private async parseResponse<T>(response: any): Promise<APIResponse<T>> {
    const status = response.status();
    const headers: Record<string, string> = {};

    response
      .headersArray()
      .forEach((header: { name: string; value: string }) => {
        headers[header.name] = header.value;
      });

    let data: T | undefined;
    let error: any;

    try {
      const body = await response.json();
      if (status >= 200 && status < 300) {
        data = body as T;
      } else {
        error = body;
      }
    } catch (e) {
      // Response might not have a body or might not be JSON
      if (status >= 200 && status < 300) {
        data = undefined;
      }
    }

    return {
      data,
      error,
      status,
      headers,
    };
  }

  /**
   * Assert successful response (2xx)
   */
  protected assertSuccess<T>(
    response: APIResponse<T>
  ): asserts response is APIResponse<T> & { data: T } {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
    expect(response.data).toBeDefined();
  }

  /**
   * Assert error response
   */
  protected assertError(
    response: APIResponse<any>,
    expectedStatus?: number
  ): void {
    if (expectedStatus) {
      expect(response.status).toBe(expectedStatus);
    } else {
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
  }
}

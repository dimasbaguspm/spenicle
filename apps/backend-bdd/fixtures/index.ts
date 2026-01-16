import { test as base } from "@playwright/test";
import { AuthAPIClient } from "./auth-client";
import { AccountAPIClient } from "./account-client";
import { CategoryAPIClient } from "./category-client";
import { TransactionAPIClient } from "./transaction-client";
import { TagAPIClient } from "./tag-client";
import { SummaryAPIClient } from "./summary-client";
import { BudgetAPIClient } from "./budget-client";
import { BudgetTemplateAPIClient } from "./budget-template-client";
import { TransactionTemplateAPIClient } from "./transaction-template-client";
import type { TestContext } from "../types/common";
import * as fs from "fs";
import * as path from "path";

/**
 * Extended test fixtures with API clients
 */
type APIFixtures = {
  testContext: TestContext;
  authAPI: AuthAPIClient;
  accountAPI: AccountAPIClient;
  categoryAPI: CategoryAPIClient;
  transactionAPI: TransactionAPIClient;
  tagAPI: TagAPIClient;
  summaryAPI: SummaryAPIClient;
  budgetAPI: BudgetAPIClient;
  budgetTemplateAPI: BudgetTemplateAPIClient;
  transactionTemplateAPI: TransactionTemplateAPIClient;
  authenticatedContext: TestContext;
};

/**
 * Load authentication tokens from saved storage state
 */
function loadAuthTokens(): { accessToken?: string; refreshToken?: string } {
  try {
    const authStatePath = path.join(process.cwd(), ".auth/user.json");
    if (fs.existsSync(authStatePath)) {
      const storageState = JSON.parse(fs.readFileSync(authStatePath, "utf-8"));

      // Extract tokens from localStorage in the storage state
      const origins = storageState.origins || [];
      for (const origin of origins) {
        if (origin.localStorage) {
          const accessToken = origin.localStorage.find(
            (item: any) => item.name === "access_token"
          )?.value;
          const refreshToken = origin.localStorage.find(
            (item: any) => item.name === "refresh_token"
          )?.value;

          if (accessToken && refreshToken) {
            return { accessToken, refreshToken };
          }
        }
      }
    }
  } catch (error) {
    console.warn("Could not load auth tokens from storage state:", error);
  }
  return {};
}

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend<APIFixtures>({
  /**
   * Test context that carries shared state across fixtures
   */
  testContext: async ({ request }, use) => {
    // Load saved auth tokens from global setup
    const { accessToken, refreshToken } = loadAuthTokens();

    const context: TestContext = {
      baseURL: `http://localhost:8081`,
      accessToken,
      refreshToken,
    };
    await use(context);
  },

  /**
   * Auth API client
   */
  authAPI: async ({ request, testContext }, use) => {
    const client = new AuthAPIClient(request, testContext);
    await use(client);
    // Cleanup: logout after test
    client.logout();
  },

  /**
   * Account API client
   */
  accountAPI: async ({ request, testContext }, use) => {
    const client = new AccountAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Category API client
   */
  categoryAPI: async ({ request, testContext }, use) => {
    const client = new CategoryAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Transaction API client
   */
  transactionAPI: async ({ request, testContext }, use) => {
    const client = new TransactionAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Tag API client
   */
  tagAPI: async ({ request, testContext }, use) => {
    const client = new TagAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Summary API client
   */
  summaryAPI: async ({ request, testContext }, use) => {
    const client = new SummaryAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Budget API client
   */
  budgetAPI: async ({ request, testContext }, use) => {
    const client = new BudgetAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Budget template API client
   */
  budgetTemplateAPI: async ({ request, testContext }, use) => {
    const client = new BudgetTemplateAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Transaction template API client
   */
  transactionTemplateAPI: async ({ request, testContext }, use) => {
    const client = new TransactionTemplateAPIClient(request, testContext);
    await use(client);
  },

  /**
   * Authenticated context - now automatically loaded from global setup
   * This fixture is kept for backward compatibility but tokens are
   * automatically available in testContext
   */
  authenticatedContext: async ({ testContext }, use) => {
    // Tokens are already loaded from storage state in testContext
    if (!testContext.accessToken) {
      throw new Error(
        "No authentication tokens found. Make sure global setup completed successfully."
      );
    }
    await use(testContext);
  },
});

export { expect } from "@playwright/test";

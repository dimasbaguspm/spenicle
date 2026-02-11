import { test as base } from "@playwright/test";
import { AuthAPIClient } from "./auth-client";
import { AccountAPIClient } from "./account-client";
import { AccountStatisticsAPIClient } from "./account-statistics-client";
import { CategoryAPIClient } from "./category-client";
import { CategoryStatisticsAPIClient } from "./category-statistics-client";
import { TransactionAPIClient } from "./transaction-client";
import { TagAPIClient } from "./tag-client";
import { SummaryAPIClient } from "./summary-client";
import { BudgetTemplateAPIClient } from "./budget-template-client";
import { TransactionTemplateAPIClient } from "./transaction-template-client";
import { PreferenceAPIClient } from "./preference-client";
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
  accountStatisticsAPI: AccountStatisticsAPIClient;
  categoryAPI: CategoryAPIClient;
  categoryStatisticsAPI: CategoryStatisticsAPIClient;
  transactionAPI: TransactionAPIClient;
  tagAPI: TagAPIClient;
  summaryAPI: SummaryAPIClient;
  budgetTemplateAPI: BudgetTemplateAPIClient;
  transactionTemplateAPI: TransactionTemplateAPIClient;
  preferenceAPI: PreferenceAPIClient;
  authenticatedContext: TestContext;
  ensureCleanDB: () => Promise<void>;
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
            (item: any) => item.name === "access_token",
          )?.value;
          const refreshToken = origin.localStorage.find(
            (item: any) => item.name === "refresh_token",
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
 * Cleanup function for tests that require database isolation
 */
async function ensureCleanDatabase(request: any, testContext: TestContext) {
  console.log("Ensuring clean database for isolated test...");

  // Create temporary clients for cleanup
  const accountAPI = new AccountAPIClient(request, testContext);
  const categoryAPI = new CategoryAPIClient(request, testContext);

  try {
    // For reordering tests, we only need to clean accounts/categories
    // since they affect display_order
    const allAccounts = await accountAPI.getAccounts({ pageSize: 1000 });
    if (allAccounts.data?.items) {
      for (const account of allAccounts.data.items) {
        try {
          await accountAPI.deleteAccount(account.id);
        } catch (e) {
          // Ignore errors
        }
      }
    }

    const allCategories = await categoryAPI.getCategories({ pageSize: 1000 });
    if (allCategories.data?.items) {
      for (const category of allCategories.data.items) {
        try {
          await categoryAPI.deleteCategory(category.id);
        } catch (e) {
          // Ignore errors
        }
      }
    }

    console.log("Database cleaned for isolated test");
  } catch (error) {
    console.warn(
      "Database cleanup encountered some errors (this is normal):",
      error,
    );
  }
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
      baseURL: `http://localhost:8080`,
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
   * Account Statistics API client
   */
  accountStatisticsAPI: async ({ request, testContext }, use) => {
    const client = new AccountStatisticsAPIClient(request, testContext);
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
   * Category Statistics API client
   */
  categoryStatisticsAPI: async ({ request, testContext }, use) => {
    const client = new CategoryStatisticsAPIClient(request, testContext);
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
   * Preference API client
   */
  preferenceAPI: async ({ request, testContext }, use) => {
    const client = new PreferenceAPIClient(request, testContext);
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
        "No authentication tokens found. Make sure global setup completed successfully.",
      );
    }
    await use(testContext);
  },

  /**
   * Fixture to ensure clean database for tests that require isolation
   */
  ensureCleanDB: async ({ request, testContext }, use) => {
    const cleanupFn = () => ensureCleanDatabase(request, testContext);
    await use(cleanupFn);
  },
});

// Remove the global beforeEach
export { expect } from "@playwright/test";

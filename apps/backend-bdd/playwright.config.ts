import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Playwright configuration for E2E API testing
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./specs",

  /* Maximum time one test can run for */
  timeout: 30 * 1000,

  /* Test execution settings */
  fullyParallel: false, // API tests should run sequentially to avoid conflicts

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Use a single worker for API tests to avoid DB conflicts */
  workers: 1,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for API requests */
    baseURL: process.env.API_BASE_URL || "http://localhost:8080",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* API request settings */
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    /* Screenshot and video settings (not needed for API tests but useful for debugging) */
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  /* Configure project for API testing */
  projects: [
    {
      name: "api-tests",
      testMatch: "**/*.spec.ts",
      use: {
        // Use saved authentication state
        storageState: ".auth/user.json",
      },
    },
  ],

  /* Global setup - performs authentication once before all tests */
  globalSetup: "./global-setup.ts",
});

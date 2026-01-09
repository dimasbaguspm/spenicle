import { request, FullConfig } from "@playwright/test";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

/**
 * Global setup for Playwright tests
 * Performs authentication once and saves tokens for all tests to reuse
 */
async function globalSetup(config: FullConfig) {
  // Load environment variables
  dotenv.config();

  const baseURL = `http://localhost:${process.env.APP_PORT}`;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  console.log("Performing global authentication setup...");

  const requestContext = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  try {
    const response = await requestContext.post("/auth/login", {
      data: {
        username,
        password,
      },
    });

    if (!response.ok()) {
      const error = await response.json();
      throw new Error(
        `Authentication failed: ${error.detail || response.statusText()}`
      );
    }

    const data = await response.json();

    if (!data.access_token || !data.refresh_token) {
      throw new Error("Login response missing tokens");
    }

    console.log("✅ Authentication successful");

    // Create .auth directory if it doesn't exist
    const authDir = path.join(process.cwd(), ".auth");
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const storageState = {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [
            {
              name: "access_token",
              value: data.access_token,
            },
            {
              name: "refresh_token",
              value: data.refresh_token,
            },
          ],
        },
      ],
    };

    const authStatePath = path.join(authDir, "user.json");
    fs.writeFileSync(authStatePath, JSON.stringify(storageState, null, 2));

    console.log("Auth tokens saved to .auth/user.json");
  } catch (error) {
    console.error("Global setup failed:", error);
    throw error;
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;

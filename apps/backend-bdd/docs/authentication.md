# Authentication & Global Setup

## Authentication Strategy

The E2E tests use a **global authentication** pattern to avoid per-test login overhead:

1. **Global Setup** (`global-setup.ts`) runs once before all tests
2. Performs a single login with admin credentials provided via the environment
   (driven by `docker-compose.yml` or local overrides)
3. Saves access & refresh tokens to `.auth/user.json` in Playwright storage state format
4. All tests automatically load these tokens via `storageState` in `playwright.config.ts`

## How It Works

### 1. Global Setup (`global-setup.ts`)

```typescript
// Runs ONCE before all tests
async function globalSetup(config: FullConfig) {
  // Construct API URL from APP_PORT (come from compose or local overrides)
  const baseURL = `http://localhost:8080`;

  // Use admin credentials from environment (compose or local overrides)
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  // Perform login
  const response = await requestContext.post("/auth/login", {
    data: { username, password },
  });

  // Save tokens to .auth/user.json
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [
          { name: "access_token", value: data.access_token },
          { name: "refresh_token", value: data.refresh_token },
        ],
      },
    ],
  };

  fs.writeFileSync(".auth/user.json", JSON.stringify(storageState));
}
```

### 2. Playwright Config

```typescript
export default defineConfig({
  // Run global setup before tests
  globalSetup: "./global-setup.ts",

  projects: [
    {
      name: "api-tests",
      use: {
        // Auto-load tokens from .auth/user.json
        storageState: ".auth/user.json",
      },
    },
  ],
});
```

### 3. Fixtures Auto-Read Tokens

All API fixtures inherit from `BaseAPIClient`, which reads tokens from `.auth/user.json`:

```typescript
class BaseAPIClient {
  protected accessToken?: string;
  protected refreshToken?: string;

  constructor(request: APIRequestContext, context: TestContext) {
    this.request = request;

    // Auto-load tokens from context (populated by global setup)
    this.accessToken = context.accessToken;
    this.refreshToken = context.refreshToken;
  }

  // All requests automatically include Authorization header
  protected async get<T>(path: string) {
    return this.request.get(path, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }
}
```

## Benefits

1. **Performance**: Login happens once, not per-test (~10x faster)
2. **Simplicity**: Tests don't need authentication boilerplate
3. **Reliability**: No test failures due to concurrent logins
4. **Isolation**: Each test run gets fresh tokens via global setup

## Environment Variables

Configuration values are provided by `docker-compose.yml` for E2E runs. To
change values edit the compose file(s) directly;

Typical values (for reference):

```bash
# Admin credentials used by the backend and tests
ADMIN_USERNAME=my_username
ADMIN_PASSWORD=my_password
APP_PORT=8080

# Docker database config
DB_HOST=spenicle-e2e-postgres
DB_PORT=5432
DB_USER=my_username
DB_PASSWORD=my_password
DB_NAME=spenicle_e2e-test
```

**Important:**

- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are used by both the backend service
  and the test global setup (they should match the values in compose or your
  overrides).
- `APP_PORT` determines the API URL (http://localhost:8081).

## Testing Authentication Endpoints

For testing auth endpoints specifically (login failures, token refresh), use the `authAPI` fixture:

```typescript
test("should fail login with invalid credentials", async ({ authAPI }) => {
  const response = await authAPI.login("invalid", "wrong");

  expect(response.status).toBe(401);
  expect(response.error).toBeDefined();
});
```

The `authAPI` fixture bypasses the global auth tokens for testing auth logic.

## Troubleshooting

### "Invalid URL" Error

**Cause**: `APP_PORT` is not set in the environment used by the compose run

**Fix**: Ensure `APP_PORT` is set in `docker-compose.yml` used by the compose
run before starting the tests.

### "Authentication failed" Error

**Cause**: Admin credentials provided to the backend don't match the test
configuration

**Fix**:

1. Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the compose configuration
   (`docker-compose.yml`)
2. Ensure docker containers are running: `sudo docker compose ps`
3. Check backend logs: `sudo docker compose logs spenicle-e2e-api`

### Tokens Not Loading in Tests

**Cause**: `.auth/user.json` not created or malformed

**Fix**:

1. Delete `.auth/user.json`
2. Run tests again (global setup will recreate it)
3. Check file exists: `cat .auth/user.json`

## Token Refresh

Token refresh is **not yet implemented** in the fixtures. Current approach:

- Tests use the access_token from global setup
- If tests run longer than token lifetime, they will fail
- Solution: Keep test runs under token expiry time, or implement refresh in BaseAPIClient

## Security Note

`.auth/user.json` contains authentication tokens and is **gitignored**. Never commit this file.

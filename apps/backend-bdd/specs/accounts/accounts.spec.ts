import { test, expect } from "../../fixtures";

/**
 * Account endpoint tests
 * Tests for /accounts endpoints
 */
test.describe("Account API", () => {
  let createdAccountId: number;

  test.describe("POST /accounts", () => {
    test("should create a new account with valid data", async ({
      accountAPI,
    }) => {
      const accountData = {
        name: "Test Checking Account",
        type: "income" as const,
        amount: 1000,
        note: "Test account for e2e",
      };

      const response = await accountAPI.createAccount(accountData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(accountData.name);
      expect(response.data?.type).toBe(accountData.type);
      expect(response.data?.amount).toBe(accountData.amount);
      expect(response.data?.id).toBeDefined();

      // Store for cleanup
      createdAccountId = response.data!.id;
    });

    test("should fail to create account with invalid data", async ({
      accountAPI,
    }) => {
      const invalidData = {
        name: "", // Empty name should fail
        type: "income" as const,
        amount: 1000,
        note: "Test note",
      };

      const response = await accountAPI.createAccount(invalidData as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();
    });

    test("should fail to create account without authentication", async ({
      request,
    }) => {
      const accountData = {
        name: "Test Account",
        type: "income" as const,
        amount: 1000,
        note: "Test note",
      };

      const response = await request.post("/accounts", {
        data: accountData,
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe("GET /accounts", () => {
    test("should get paginated list of accounts", async ({ accountAPI }) => {
      const response = await accountAPI.getAccounts();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.items).toBeDefined();
      expect(Array.isArray(response.data?.items)).toBe(true);
      expect(response.data?.pageTotal).toBeDefined();
      expect(response.data?.totalCount).toBeDefined();
    });

    test("should filter accounts by search term", async ({ accountAPI }) => {
      const response = await accountAPI.getAccounts({ name: "Test" });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data?.items)).toBe(true);
    });

    test("should paginate accounts correctly", async ({ accountAPI }) => {
      const response = await accountAPI.getAccounts({
        pageNumber: 1,
        pageSize: 10,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.pageNumber).toBe(1);
      expect(response.data?.pageSize).toBe(10);
      if (response.data?.items) {
        expect(response.data.items.length).toBeLessThanOrEqual(10);
      }
    });
  });

  test.describe("GET /accounts/:id", () => {
    test("should get a single account by ID", async ({ accountAPI }) => {
      // First create an account
      const createResponse = await accountAPI.createAccount({
        name: "Account for Get Test",
        type: "expense" as const,
        amount: 500,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const accountId = createResponse.data!.id;

      // Now get it
      const response = await accountAPI.getAccount(accountId);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBe(accountId);
      expect(response.data?.name).toBe("Account for Get Test");

      // Cleanup
      await accountAPI.deleteAccount(accountId);
    });

    test("should return 404 for non-existent account", async ({
      accountAPI,
    }) => {
      const response = await accountAPI.getAccount(999999);

      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });

    test("should return 400 for invalid account ID", async ({ accountAPI }) => {
      const response = await accountAPI.getAccount(-1);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();
    });
  });

  test.describe("PATCH /accounts/:id", () => {
    test("should update an account successfully", async ({ accountAPI }) => {
      // First create an account
      const createResponse = await accountAPI.createAccount({
        name: "Account to Update",
        type: "income" as const,
        amount: 1000,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const accountId = createResponse.data!.id;

      // Update it
      const updateData = {
        name: "Updated Account Name",
        amount: 1500,
      };

      const response = await accountAPI.updateAccount(accountId, updateData);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(updateData.name);
      expect(response.data?.amount).toBe(updateData.amount);

      // Cleanup
      await accountAPI.deleteAccount(accountId);
    });

    test("should fail to update with invalid data", async ({ accountAPI }) => {
      // First create an account
      const createResponse = await accountAPI.createAccount({
        name: "Account for Invalid Update",
        type: "income" as const,
        amount: 1000,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const accountId = createResponse.data!.id;

      // Try to update with invalid data
      const response = await accountAPI.updateAccount(accountId, {
        name: "", // Empty name should fail
      });

      expect(response.status).toBeGreaterThanOrEqual(400);

      // Cleanup
      await accountAPI.deleteAccount(accountId);
    });
  });

  test.describe("DELETE /accounts/:id", () => {
    test("should delete an account successfully", async ({ accountAPI }) => {
      // First create an account
      const createResponse = await accountAPI.createAccount({
        name: "Account to Delete",
        type: "income" as const,
        amount: 1000,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const accountId = createResponse.data!.id;

      // Delete it
      const response = await accountAPI.deleteAccount(accountId);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Verify it's deleted
      const getResponse = await accountAPI.getAccount(accountId);
      expect(getResponse.status).toBe(404);
    });

    test("should return 404 when deleting non-existent account", async ({
      accountAPI,
    }) => {
      const response = await accountAPI.deleteAccount(999999);

      expect(response.status).toBe(404);
    });
  });

  test.describe("POST /accounts/reorder", () => {
    test("should reorder accounts successfully", async ({ accountAPI }) => {
      // Create multiple accounts
      const account1 = await accountAPI.createAccount({
        name: "Account 1",
        type: "income" as const,
        amount: 100,
        note: "Test note 1",
      });

      const account2 = await accountAPI.createAccount({
        name: "Account 2",
        type: "expense" as const,
        amount: 200,
        note: "Test note 2",
      });

      expect(account1.data).toBeDefined();
      expect(account2.data).toBeDefined();

      // Reorder them
      const response = await accountAPI.reorderAccounts({
        items: [
          { id: account2.data!.id, displayOrder: 1 },
          { id: account1.data!.id, displayOrder: 2 },
        ],
      });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Cleanup
      await accountAPI.deleteAccount(account1.data!.id);
      await accountAPI.deleteAccount(account2.data!.id);
    });
  });

  test.describe("Archive/Unarchive operations", () => {
    test("should archive and unarchive an account", async ({ accountAPI }) => {
      // Create account
      const createResponse = await accountAPI.createAccount({
        name: "Account to Archive",
        type: "income" as const,
        amount: 1000,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const accountId = createResponse.data!.id;

      // Archive it
      const archiveResponse = await accountAPI.archiveAccount(accountId);
      expect(archiveResponse.status).toBe(200);
      expect(archiveResponse.data?.archivedAt).toBeDefined();

      // Unarchive it using the helper method
      const unarchiveResponse = await accountAPI.unarchiveAccount(accountId);
      expect(unarchiveResponse.status).toBe(200);
      expect(unarchiveResponse.data?.archivedAt).toBeUndefined();

      // Cleanup
      await accountAPI.deleteAccount(accountId);
    });
  });
});

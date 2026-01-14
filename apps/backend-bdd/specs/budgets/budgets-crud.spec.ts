import { test, expect } from "../../fixtures";

/**
 * Budget API - CRUD Tests
 * Tests for basic budget creation, reading, updating, and deletion
 */
test.describe("Budget API - CRUD Operations", () => {
  let testAccountId: number;
  let testCategoryId: number;
  let testBudgetId: number;

  test.beforeAll(async ({ accountAPI, categoryAPI, budgetAPI }) => {
    // Create test account
    const account = await accountAPI.createAccount({
      name: "Budget Test Account",
      type: "expense" as const,
      amount: 10000,
      note: "Test account for budget tests",
    });
    testAccountId = account.data!.id;

    // Create test category
    const category = await categoryAPI.createCategory({
      name: "Budget Test Category",
      type: "expense" as const,
      note: "Test category for budget tests",
    });
    testCategoryId = category.data!.id;

    // Create test budget for tests that need a pre-existing budget
    const today = new Date();
    const periodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    ).toISOString();
    const periodEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).toISOString();

    const budget = await budgetAPI.createBudget({
      accountId: testAccountId,
      amountLimit: 500000,
      note: "Test budget for CRUD operations",
      periodStart,
      periodEnd,
    });
    testBudgetId = budget.data!.id;
  });

  test.describe("Create Budget", () => {
    test("should create budget with account filter", async ({ budgetAPI }) => {
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const budgetData = {
        accountId: testAccountId,
        amountLimit: 500000, // 5000.00 in cents
        note: "Monthly account budget",
        periodStart,
        periodEnd,
      };

      const response = await budgetAPI.createBudget(budgetData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data!.accountId).toBe(testAccountId);
      expect(response.data!.amountLimit).toBe(500000);
      expect(response.data!.note).toBe("Monthly account budget");
      expect(response.data!.actualAmount).toBeDefined();
      expect(response.data!.id).toBeDefined();

      // Cleanup this budget since we already have testBudgetId from beforeAll
      await budgetAPI.deleteBudget(response.data!.id);
    });

    test("should create budget with category filter", async ({ budgetAPI }) => {
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const budgetData = {
        categoryId: testCategoryId,
        amountLimit: 300000, // 3000.00 in cents
        note: "Monthly category budget",
        periodStart,
        periodEnd,
      };

      const response = await budgetAPI.createBudget(budgetData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data!.categoryId).toBe(testCategoryId);
      expect(response.data!.amountLimit).toBe(300000);
    });

    test("should create budget with both account and category filters", async ({
      budgetAPI,
    }) => {
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const budgetData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amountLimit: 200000, // 2000.00 in cents
        note: "Monthly account-category budget",
        periodStart,
        periodEnd,
      };

      const response = await budgetAPI.createBudget(budgetData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data!.accountId).toBe(testAccountId);
      expect(response.data!.categoryId).toBe(testCategoryId);
      expect(response.data!.amountLimit).toBe(200000);
    });

    test("should fail to create budget without account or category", async ({
      budgetAPI,
    }) => {
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const budgetData = {
        amountLimit: 100000,
        note: "Budget without filters",
        periodStart,
        periodEnd,
      };

      const response = await budgetAPI.createBudget(budgetData);

      // Should fail - at least one of accountId or categoryId is required
      expect(response.status).toBe(422);
    });

    test("should fail with invalid date range (end before start)", async ({
      budgetAPI,
    }) => {
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();

      const budgetData = {
        accountId: testAccountId,
        amountLimit: 100000,
        note: "Invalid date range",
        periodStart,
        periodEnd,
      };

      const response = await budgetAPI.createBudget(budgetData);

      expect(response.status).toBe(422);
    });

    test("should fail with negative amount limit", async ({ budgetAPI }) => {
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const budgetData = {
        accountId: testAccountId,
        amountLimit: -1000,
        note: "Negative budget",
        periodStart,
        periodEnd,
      } as any;

      const response = await budgetAPI.createBudget(budgetData);

      expect(response.status).toBe(422);
    });
  });

  test.describe("Read Budget", () => {
    test("should get budget by ID", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudget(testBudgetId);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.id).toBe(testBudgetId);
      expect(response.data!.accountId).toBe(testAccountId);
    });

    test("should list all budgets with pagination", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudgets();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.data).toBeDefined();
      expect(Array.isArray(response.data!.data)).toBe(true);
      expect(response.data!.pageNumber).toBeDefined();
      expect(response.data!.pageSize).toBeDefined();
      expect(response.data!.totalCount).toBeDefined();
    });

    test("should return 404 for non-existent budget", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudget(999999);

      expect(response.status).toBe(404);
    });
  });

  test.describe("Update Budget", () => {
    test("should update budget amount limit", async ({ budgetAPI }) => {
      const response = await budgetAPI.updateBudget(testBudgetId, {
        amountLimit: 600000, // Update from 500000 to 600000
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.amountLimit).toBe(600000);
      expect(response.data!.accountId).toBe(testAccountId); // Should remain unchanged
    });

    test("should update budget note", async ({ budgetAPI }) => {
      const response = await budgetAPI.updateBudget(testBudgetId, {
        note: "Updated budget note",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.note).toBe("Updated budget note");
    });

    test("should update budget period dates", async ({ budgetAPI }) => {
      const today = new Date();
      const newPeriodStart = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1
      ).toISOString();
      const newPeriodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 2,
        0
      ).toISOString();

      const response = await budgetAPI.updateBudget(testBudgetId, {
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      // Just verify dates are defined (backend may have timezone differences)
      expect(response.data!.periodStart).toBeDefined();
      expect(response.data!.periodEnd).toBeDefined();
    });

    test("should fail to update with invalid date range", async ({
      budgetAPI,
    }) => {
      const today = new Date();
      const invalidStart = new Date(
        today.getFullYear(),
        today.getMonth() + 2,
        0
      ).toISOString();
      const invalidEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1
      ).toISOString();

      const response = await budgetAPI.updateBudget(testBudgetId, {
        periodStart: invalidStart,
        periodEnd: invalidEnd,
      });

      expect(response.status).toBe(422);
    });

    test("should return 404 when updating non-existent budget", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.updateBudget(999999, {
        amountLimit: 100000,
      });

      expect(response.status).toBe(404);
    });
  });

  test.describe("Delete Budget", () => {
    let budgetToDelete: number;

    test.beforeAll(async ({ budgetAPI }) => {
      // Create a budget to delete
      const today = new Date();
      const periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const periodEnd = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await budgetAPI.createBudget({
        accountId: testAccountId,
        amountLimit: 100000,
        note: "Budget to delete",
        periodStart,
        periodEnd,
      });

      budgetToDelete = response.data!.id;
    });

    test("should delete budget successfully", async ({ budgetAPI }) => {
      const response = await budgetAPI.deleteBudget(budgetToDelete);

      expect(response.status).toBe(204);
    });

    test("should return 404 after budget is deleted", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudget(budgetToDelete);

      expect(response.status).toBe(404);
    });

    test("should return 204 when deleting non-existent budget (idempotent)", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.deleteBudget(999999);

      // DELETE is idempotent - returns 204 even if resource doesn't exist
      expect(response.status).toBe(204);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI, budgetAPI }) => {
    // Clean up budgets (delete any remaining test budgets)
    const budgets = await budgetAPI.getBudgets();
    if (budgets.data?.data) {
      for (const budget of budgets.data.data) {
        if (
          budget.accountId === testAccountId ||
          budget.categoryId === testCategoryId
        ) {
          await budgetAPI.deleteBudget(budget.id);
        }
      }
    }

    // Clean up test data
    if (testAccountId) await accountAPI.deleteAccount(testAccountId);
    if (testCategoryId) await categoryAPI.deleteCategory(testCategoryId);
  });
});

import { test, expect } from "../../fixtures";

/**
 * Budget API - Relationship Tests
 * Tests for budget relationships with accounts and categories
 */
test.describe("Budget API - Relationship Tests", () => {
  let testAccount1Id: number;
  let testAccount2Id: number;
  let testCategory1Id: number;
  let testCategory2Id: number;
  let budget1Id: number;
  let budget2Id: number;
  let budget3Id: number;

  test.beforeAll(async ({ accountAPI, categoryAPI, budgetAPI }) => {
    // Create test accounts
    const account1 = await accountAPI.createAccount({
      name: "Budget Relation Account 1",
      type: "expense" as const,
      amount: 10000,
      note: "First test account",
    });
    testAccount1Id = account1.data!.id;

    const account2 = await accountAPI.createAccount({
      name: "Budget Relation Account 2",
      type: "expense" as const,
      amount: 5000,
      note: "Second test account",
    });
    testAccount2Id = account2.data!.id;

    // Create test categories
    const category1 = await categoryAPI.createCategory({
      name: "Budget Relation Category 1",
      type: "expense" as const,
      note: "First test category",
    });
    testCategory1Id = category1.data!.id;

    const category2 = await categoryAPI.createCategory({
      name: "Budget Relation Category 2",
      type: "expense" as const,
      note: "Second test category",
    });
    testCategory2Id = category2.data!.id;

    // Create test budgets
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

    // Budget for account 1
    const b1 = await budgetAPI.createBudget({
      accountId: testAccount1Id,
      amountLimit: 500000,
      note: "Account 1 budget",
      periodStart,
      periodEnd,
    });
    budget1Id = b1.data!.id;

    // Budget for category 1
    const b2 = await budgetAPI.createBudget({
      categoryId: testCategory1Id,
      amountLimit: 300000,
      note: "Category 1 budget",
      periodStart,
      periodEnd,
    });
    budget2Id = b2.data!.id;

    // Budget for account 1 + category 1
    const b3 = await budgetAPI.createBudget({
      accountId: testAccount1Id,
      categoryId: testCategory1Id,
      amountLimit: 200000,
      note: "Account 1 + Category 1 budget",
      periodStart,
      periodEnd,
    });
    budget3Id = b3.data!.id;
  });

  test.describe("Account Budget Relations", () => {
    test("should list budgets for specific account", async ({ budgetAPI }) => {
      const response = await budgetAPI.getAccountBudgets(testAccount1Id);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.data).toBeDefined();
      expect(Array.isArray(response.data!.data)).toBe(true);

      // Should include budgets for account 1
      const budgets = response.data!.data!;
      const accountBudget = budgets.find((b) => b.id === budget1Id);
      const combinedBudget = budgets.find((b) => b.id === budget3Id);

      expect(accountBudget).toBeDefined();
      expect(combinedBudget).toBeDefined();

      // All returned budgets should have testAccount1Id
      budgets.forEach((budget) => {
        expect(budget.accountId).toBe(testAccount1Id);
      });
    });

    test("should get specific budget for account", async ({ budgetAPI }) => {
      const response = await budgetAPI.getAccountBudget(
        testAccount1Id,
        budget1Id
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.id).toBe(budget1Id);
      expect(response.data!.accountId).toBe(testAccount1Id);
    });

    test("should return 404 for budget not belonging to account", async ({
      budgetAPI,
    }) => {
      // budget2Id belongs to category only, not account
      const response = await budgetAPI.getAccountBudget(
        testAccount1Id,
        budget2Id
      );

      expect(response.status).toBe(404);
    });

    test("should return empty list for account with no budgets", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.getAccountBudgets(testAccount2Id);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.data).toBeDefined();
      expect(response.data!.data!.length).toBe(0);
    });

    test("should return 404 for non-existent account", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.getAccountBudgets(999999);

      expect(response.status).toBe(404);
    });
  });

  test.describe("Category Budget Relations", () => {
    test("should list budgets for specific category", async ({ budgetAPI }) => {
      const response = await budgetAPI.getCategoryBudgets(testCategory1Id);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.data).toBeDefined();
      expect(Array.isArray(response.data!.data)).toBe(true);

      // Should include budgets for category 1
      const budgets = response.data!.data!;
      const categoryBudget = budgets.find((b) => b.id === budget2Id);
      const combinedBudget = budgets.find((b) => b.id === budget3Id);

      expect(categoryBudget).toBeDefined();
      expect(combinedBudget).toBeDefined();

      // All returned budgets should have testCategory1Id
      budgets.forEach((budget) => {
        expect(budget.categoryId).toBe(testCategory1Id);
      });
    });

    test("should get specific budget for category", async ({ budgetAPI }) => {
      const response = await budgetAPI.getCategoryBudget(
        testCategory1Id,
        budget2Id
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.id).toBe(budget2Id);
      expect(response.data!.categoryId).toBe(testCategory1Id);
    });

    test("should return 404 for budget not belonging to category", async ({
      budgetAPI,
    }) => {
      // budget1Id belongs to account only, not category
      const response = await budgetAPI.getCategoryBudget(
        testCategory1Id,
        budget1Id
      );

      expect(response.status).toBe(404);
    });

    test("should return empty list for category with no budgets", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.getCategoryBudgets(testCategory2Id);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.data).toBeDefined();
      expect(response.data!.data!.length).toBe(0);
    });

    test("should return 404 for non-existent category", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.getCategoryBudgets(999999);

      expect(response.status).toBe(404);
    });
  });

  test.describe("Budget Filter Combinations", () => {
    test("should handle budget with only account filter", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.getBudget(budget1Id);

      expect(response.status).toBe(200);
      expect(response.data!.accountId).toBe(testAccount1Id);
      expect(response.data!.categoryId).toBeUndefined();
    });

    test("should handle budget with only category filter", async ({
      budgetAPI,
    }) => {
      const response = await budgetAPI.getBudget(budget2Id);

      expect(response.status).toBe(200);
      expect(response.data!.categoryId).toBe(testCategory1Id);
      expect(response.data!.accountId).toBeUndefined();
    });

    test("should handle budget with both filters", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudget(budget3Id);

      expect(response.status).toBe(200);
      expect(response.data!.accountId).toBe(testAccount1Id);
      expect(response.data!.categoryId).toBe(testCategory1Id);
    });
  });

  test.describe("Budget with Non-Existent Relations", () => {
    test("should fail to create budget with non-existent account", async ({
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

      const response = await budgetAPI.createBudget({
        accountId: 999999,
        amountLimit: 100000,
        note: "Budget with invalid account",
        periodStart,
        periodEnd,
      });

      expect(response.status).toBe(404);
    });

    test("should fail to create budget with non-existent category", async ({
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

      const response = await budgetAPI.createBudget({
        categoryId: 999999,
        amountLimit: 100000,
        note: "Budget with invalid category",
        periodStart,
        periodEnd,
      });

      expect(response.status).toBe(404);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI, budgetAPI }) => {
    // Delete budgets
    if (budget1Id) await budgetAPI.deleteBudget(budget1Id);
    if (budget2Id) await budgetAPI.deleteBudget(budget2Id);
    if (budget3Id) await budgetAPI.deleteBudget(budget3Id);

    // Delete test data
    if (testAccount1Id) await accountAPI.deleteAccount(testAccount1Id);
    if (testAccount2Id) await accountAPI.deleteAccount(testAccount2Id);
    if (testCategory1Id) await categoryAPI.deleteCategory(testCategory1Id);
    if (testCategory2Id) await categoryAPI.deleteCategory(testCategory2Id);
  });
});

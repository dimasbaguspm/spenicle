import { test, expect } from "../../fixtures";
import type { CreateBudgetSchema } from "../../fixtures/budget-client";

/**
 * Budget API - Business Requirements & Edge Cases
 * Tests for complex budget scenarios, actual amount tracking, and edge cases
 */
test.describe("Budget API - Business Requirements", () => {
  let testAccountId: number;
  let testCategoryId: number;
  let testBudgetId: number;

  test.beforeAll(async ({ accountAPI, categoryAPI, budgetAPI }) => {
    // Create test account
    const account = await accountAPI.createAccount({
      name: "Budget Business Test Account",
      type: "expense" as const,
      amount: 100000,
      note: "Test account for budget business logic",
    });
    testAccountId = account.data!.id;

    // Create test category
    const category = await categoryAPI.createCategory({
      name: "Budget Business Test Category",
      type: "expense" as const,
      note: "Test category for budget business logic",
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
      note: "Test budget",
      periodStart,
      periodEnd,
    });
    testBudgetId = budget.data!.id;
  });

  test.describe("Actual Amount Tracking", () => {
    test("should initialize budget with zero actual amount", async ({
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
        accountId: testAccountId,
        amountLimit: 500000,
        note: "Budget for actual amount test",
        periodStart,
        periodEnd,
      });

      expect(response.status).toBe(201);
      expect(response.data!.actualAmount).toBeDefined();
      // Initial actual amount should be 0 (no transactions yet)
      expect(response.data!.actualAmount).toBe(0);

      testBudgetId = response.data!.id;
    });

    test("should track actual amount with transactions", async ({
      budgetAPI,
      transactionAPI,
    }) => {
      // Create transaction within budget period
      const today = new Date();
      const transactionDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        15
      ).toISOString();

      const transaction = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100000, // 1000.00
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: transactionDate,
      });

      // Fetch budget to see updated actual amount
      const budgetResponse = await budgetAPI.getBudget(testBudgetId);

      expect(budgetResponse.status).toBe(200);
      expect(budgetResponse.data!.actualAmount).toBeGreaterThan(0);
      // Should include the transaction amount
      expect(budgetResponse.data!.actualAmount).toBeGreaterThanOrEqual(100000);

      // Cleanup transaction
      await transactionAPI.deleteTransaction(transaction.data!.id);
    });

    test("should exclude transactions outside budget period", async ({
      budgetAPI,
      transactionAPI,
    }) => {
      // Get current budget state
      const beforeResponse = await budgetAPI.getBudget(testBudgetId);
      const actualAmountBefore = beforeResponse.data!.actualAmount;

      // Create transaction outside budget period (next month)
      const today = new Date();
      const nextMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 2,
        15
      ).toISOString();

      const transaction = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 50000,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: nextMonth,
      });

      // Fetch budget again
      const afterResponse = await budgetAPI.getBudget(testBudgetId);

      // Actual amount should remain the same (transaction outside period)
      expect(afterResponse.data!.actualAmount).toBe(actualAmountBefore);

      // Cleanup transaction
      await transactionAPI.deleteTransaction(transaction.data!.id);
    });
  });

  test.describe("Overlapping Budget Periods", () => {
    test("should allow overlapping budgets for different accounts", async ({
      budgetAPI,
      accountAPI,
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

      // Create second account
      const account2Response = await accountAPI.createAccount({
        name: "Overlap Test Account 2",
        type: "expense" as const,
        amount: 5000,
        note: "Second account",
      });
      const account2Id = account2Response.data!.id;

      // Create budget for original account
      const budget1 = await budgetAPI.createBudget({
        accountId: testAccountId,
        amountLimit: 100000,
        note: "Budget 1",
        periodStart,
        periodEnd,
      });

      // Create budget for second account with same period
      const budget2 = await budgetAPI.createBudget({
        accountId: account2Id,
        amountLimit: 200000,
        note: "Budget 2",
        periodStart,
        periodEnd,
      });

      // Both should succeed
      expect(budget1.status).toBe(201);
      expect(budget2.status).toBe(201);

      // Cleanup
      await budgetAPI.deleteBudget(budget1.data!.id);
      await budgetAPI.deleteBudget(budget2.data!.id);
      await accountAPI.deleteAccount(account2Id);
    });

    test("should allow overlapping budgets for different categories", async ({
      budgetAPI,
      categoryAPI,
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

      // Create second category
      const category2Response = await categoryAPI.createCategory({
        name: "Overlap Test Category 2",
        type: "expense" as const,
        note: "Second category",
      });
      const category2Id = category2Response.data!.id;

      // Create budget for original category
      const budget1 = await budgetAPI.createBudget({
        categoryId: testCategoryId,
        amountLimit: 100000,
        note: "Category Budget 1",
        periodStart,
        periodEnd,
      });

      // Create budget for second category with same period
      const budget2 = await budgetAPI.createBudget({
        categoryId: category2Id,
        amountLimit: 200000,
        note: "Category Budget 2",
        periodStart,
        periodEnd,
      });

      // Both should succeed
      expect(budget1.status).toBe(201);
      expect(budget2.status).toBe(201);

      // Cleanup
      await budgetAPI.deleteBudget(budget1.data!.id);
      await budgetAPI.deleteBudget(budget2.data!.id);
      await categoryAPI.deleteCategory(category2Id);
    });
  });

  test.describe("Budget Period Edge Cases", () => {
    test("should handle same-day period (start equals end)", async ({
      budgetAPI,
    }) => {
      const today = new Date();
      const sameDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        15
      ).toISOString();

      const response = await budgetAPI.createBudget({
        accountId: testAccountId,
        amountLimit: 100000,
        note: "Same-day budget",
        periodStart: sameDate,
        periodEnd: sameDate,
      });

      expect(response.status).toBe(201);
      // Just verify same-day period is accepted (dates may have timezone differences)
      expect(response.data!.periodStart).toBeDefined();
      expect(response.data!.periodEnd).toBeDefined();

      // Cleanup
      await budgetAPI.deleteBudget(response.data!.id);
    });

    test("should handle long-term budget (one year)", async ({ budgetAPI }) => {
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1).toISOString();
      const yearEnd = new Date(today.getFullYear(), 11, 31).toISOString();

      const response = await budgetAPI.createBudget({
        accountId: testAccountId,
        amountLimit: 10000000, // Large budget for yearly period
        note: "Yearly budget",
        periodStart: yearStart,
        periodEnd: yearEnd,
      });

      expect(response.status).toBe(201);

      // Cleanup
      await budgetAPI.deleteBudget(response.data!.id);
    });

    test("should handle budget spanning multiple months", async ({
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
        today.getMonth() + 3,
        0
      ).toISOString();

      const response = await budgetAPI.createBudget({
        accountId: testAccountId,
        amountLimit: 500000,
        note: "Multi-month budget",
        periodStart,
        periodEnd,
      });

      expect(response.status).toBe(201);

      // Cleanup
      await budgetAPI.deleteBudget(response.data!.id);
    });
  });

  test.describe("Budget Amount Limits", () => {
    test("should handle zero amount limit", async ({ budgetAPI }) => {
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
        amountLimit: 0,
        note: "Zero limit budget (tracking only)",
        periodStart,
        periodEnd,
      });

      // Zero amount should fail validation (minimum is 1)
      expect(response.status).toBe(422);
    });

    test("should handle very large amount limit", async ({ budgetAPI }) => {
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
        amountLimit: 999999999999, // Very large but valid int64
        note: "Very large limit budget",
        periodStart,
        periodEnd,
      });

      expect(response.status).toBe(201);
      expect(response.data!.amountLimit).toBe(999999999999);

      // Cleanup
      await budgetAPI.deleteBudget(response.data!.id);
    });
  });

  test.describe("Budget Notes", () => {
    test("should handle empty note", async ({ budgetAPI }) => {
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
        note: "",
        periodStart,
        periodEnd,
      });

      expect(response.status).toBe(201);
      expect(response.data!.note).toBe("");

      // Cleanup
      await budgetAPI.deleteBudget(response.data!.id);
    });

    test("should handle very long note", async ({ budgetAPI }) => {
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

      const longNote = "A".repeat(1000); // 1000 character note (exceeds 500 limit)

      const response = await budgetAPI.createBudget({
        accountId: testAccountId,
        amountLimit: 100000,
        note: longNote,
        periodStart,
        periodEnd,
      });

      // Should fail validation (max 500 characters)
      expect(response.status).toBe(422);
    });
  });

  test.describe("Pagination", () => {
    let budgetIds: number[] = [];

    test.beforeAll(async ({ budgetAPI }) => {
      // Create multiple budgets for pagination test
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

      for (let i = 0; i < 15; i++) {
        const response = await budgetAPI.createBudget({
          accountId: testAccountId,
          amountLimit: 100000 + i * 10000,
          note: `Pagination test budget ${i + 1}`,
          periodStart,
          periodEnd,
        });
        budgetIds.push(response.data!.id);
      }
    });

    test("should paginate budget list correctly", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudgets();

      expect(response.status).toBe(200);
      expect(response.data!.items).toBeDefined();
      expect(Array.isArray(response.data!.items)).toBe(true);
      expect(response.data!.pageNumber).toBeDefined();
      expect(response.data!.pageSize).toBeDefined();
      expect(response.data!.totalCount).toBeGreaterThan(0);
    });

    test("should return pagination metadata", async ({ budgetAPI }) => {
      const response = await budgetAPI.getBudgets();

      expect(response.status).toBe(200);
      expect(response.data!.pageNumber).toBeGreaterThanOrEqual(1);
      expect(response.data!.pageSize).toBeGreaterThan(0);
      expect(response.data!.pageTotal).toBeGreaterThanOrEqual(1);
    });

    test.afterAll(async ({ budgetAPI }) => {
      // Cleanup pagination test budgets
      for (const id of budgetIds) {
        await budgetAPI.deleteBudget(id);
      }
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI, budgetAPI }) => {
    // Clean up any remaining budgets
    const budgets = await budgetAPI.getBudgets();
    if (budgets.data?.items) {
      for (const budget of budgets.data.items) {
        if (
          budget.accountId === testAccountId ||
          budget.categoryId === testCategoryId
        ) {
          await budgetAPI.deleteBudget(budget.id);
        }
      }
    }

    // Delete main test budget if it still exists
    if (testBudgetId) {
      await budgetAPI.deleteBudget(testBudgetId).catch(() => {
        // Ignore error if already deleted
      });
    }

    // Delete test data
    if (testAccountId) await accountAPI.deleteAccount(testAccountId);
    if (testCategoryId) await categoryAPI.deleteCategory(testCategoryId);
  });
});

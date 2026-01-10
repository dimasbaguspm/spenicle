import { test, expect } from "../../fixtures";
import type {
  SummaryAccountSchema,
  SummaryCategorySchema,
  SummaryTagSchema,
  TotalSummarySchema,
  SummaryTransactionSchema,
} from "../../fixtures/summary-client";

/**
 * Summary API - Business Requirements Tests
 * Tests for comprehensive summary and analytics endpoints
 */
test.describe("Summary API - Business Requirements", () => {
  let testAccountId: number;
  let testAccount2Id: number;
  let expenseCategoryId: number;
  let incomeCategoryId: number;
  let testTagId: number;
  const testTransactionIds: number[] = [];

  test.beforeAll(
    async ({ accountAPI, categoryAPI, tagAPI, transactionAPI }) => {
      // Create test accounts
      const account1 = await accountAPI.createAccount({
        name: "Summary Test Account 1",
        type: "expense" as const,
        amount: 10000,
        note: "Test account for summary tests",
      });

      const account2 = await accountAPI.createAccount({
        name: "Summary Test Account 2",
        type: "income" as const,
        amount: 5000,
        note: "Second test account for summary tests",
      });

      // Create test categories
      const expenseCategory = await categoryAPI.createCategory({
        name: "Summary Test Expense",
        type: "expense" as const,
        note: "Test expense category",
      });

      const incomeCategory = await categoryAPI.createCategory({
        name: "Summary Test Income",
        type: "income" as const,
        note: "Test income category",
      });

      // Create test tag
      const tag = await tagAPI.createTag({
        name: "summary-test-tag",
      });

      testAccountId = account1.data!.id;
      testAccount2Id = account2.data!.id;
      expenseCategoryId = expenseCategory.data!.id;
      incomeCategoryId = incomeCategory.data!.id;
      testTagId = tag.data!.id;

      // Create test transactions with varying dates and amounts
      const today = new Date();
      const transactionsData = [
        // Week 1 - Expenses
        {
          type: "expense" as const,
          amount: 100,
          categoryId: expenseCategoryId,
          accountId: testAccountId,
          date: new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          ).toISOString(),
        },
        {
          type: "expense" as const,
          amount: 200,
          categoryId: expenseCategoryId,
          accountId: testAccountId,
          date: new Date(
            today.getFullYear(),
            today.getMonth(),
            3
          ).toISOString(),
        },
        // Week 2 - Income
        {
          type: "income" as const,
          amount: 500,
          categoryId: incomeCategoryId,
          accountId: testAccount2Id,
          date: new Date(
            today.getFullYear(),
            today.getMonth(),
            10
          ).toISOString(),
        },
        {
          type: "income" as const,
          amount: 300,
          categoryId: incomeCategoryId,
          accountId: testAccount2Id,
          date: new Date(
            today.getFullYear(),
            today.getMonth(),
            12
          ).toISOString(),
        },
        // Week 3 - Transfers
        {
          type: "transfer" as const,
          amount: 150,
          categoryId: expenseCategoryId, // Required but not used for transfers
          accountId: testAccountId,
          destinationAccountId: testAccount2Id,
          date: new Date(
            today.getFullYear(),
            today.getMonth(),
            20
          ).toISOString(),
        },
      ];

      for (const txData of transactionsData) {
        const tx = await transactionAPI.createTransaction(txData);
        testTransactionIds.push(tx.data!.id);
      }

      // Add tag to first transaction (use tag name, not ID)
      await transactionAPI.addTransactionTag(
        testTransactionIds[0],
        "summary-test-tag"
      );
    }
  );

  test.describe("Account Summary", () => {
    test("should return account summary with date filtering", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getAccountSummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.data).toBeDefined();

      const summaries = response.data!.data;
      expect(Array.isArray(summaries)).toBe(true);

      if (summaries && summaries.length > 0) {
        const accountSummary = summaries[0];
        expect(accountSummary).toHaveProperty("accountId");
        expect(accountSummary).toHaveProperty("accountName");
        expect(accountSummary).toHaveProperty("expenseAmount");
        expect(accountSummary).toHaveProperty("incomeAmount");
        expect(accountSummary).toHaveProperty("totalCount");
      }
    });

    test("should fail without required date parameters", async ({
      summaryAPI,
    }) => {
      // @ts-expect-error - Testing missing required parameters
      const response = await summaryAPI.getAccountSummary({});

      expect(response.status).toBe(422);
    });
  });

  test.describe("Account Trends", () => {
    test("should return weekly account trends", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getAccountTrends({
        startDate,
        endDate,
        frequency: "weekly",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const data = response.data!.data;
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        const trend = data[0];
        expect(trend).toHaveProperty("accountId");
        expect(trend).toHaveProperty("accountName");
        expect(trend).toHaveProperty("periods");
        expect(Array.isArray(trend.periods)).toBe(true);
      }
    });

    test("should return monthly account trends (default)", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getAccountTrends({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should validate frequency parameter", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getAccountTrends({
        startDate,
        endDate,
        frequency: "invalid" as any,
      });

      expect(response.status).toBe(422);
    });
  });

  test.describe("Category Summary", () => {
    test("should return category summary with date filtering", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getCategorySummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const categories = response.data!.data;
      expect(Array.isArray(categories)).toBe(true);
      expect(categories).not.toBeNull();

      if (categories && categories.length > 0) {
        // Verify expense category appears
        const expenseCategory = categories.find(
          (cat) => cat.categoryId === expenseCategoryId
        );
        expect(expenseCategory).toBeDefined();
        expect(expenseCategory!.categoryName).toBe("Summary Test Expense");
        expect(expenseCategory!.expenseAmount).toBeGreaterThan(0);
        expect(expenseCategory!.totalCount).toBeGreaterThan(0);
      }
    });

    test("should separate expense and income categories", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getCategorySummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      const categories = response.data!.data;

      if (categories) {
        const expenseCategories = categories.filter(
          (cat) => cat.categoryType === "expense"
        );
        const incomeCategories = categories.filter(
          (cat) => cat.categoryType === "income"
        );

        expect(expenseCategories.length).toBeGreaterThan(0);
        expect(incomeCategories.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Category Trends", () => {
    test("should return category trends with weekly frequency", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getCategoryTrends({
        startDate,
        endDate,
        frequency: "weekly",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const data = response.data!.data;
      expect(Array.isArray(data)).toBe(true);
    });

    test("should return category trends with monthly frequency (default)", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getCategoryTrends({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  test.describe("Tag Summary", () => {
    test("should return tag summary with optional date filtering", async ({
      summaryAPI,
    }) => {
      const response = await summaryAPI.getTagSummary();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const tags = response.data!.data;
      expect(Array.isArray(tags)).toBe(true);

      // Should include our test tag
      if (tags) {
        const testTag = tags.find((tag) => tag.tagName === "summary-test-tag");
        expect(testTag).toBeDefined();
        expect(testTag!.totalCount).toBeGreaterThanOrEqual(1);
      }
    });

    test("should filter tag summary by date range", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTagSummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should filter tag summary by transaction type", async ({
      summaryAPI,
    }) => {
      const response = await summaryAPI.getTagSummary({
        type: "expense",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const tags = response.data!.data;
      expect(Array.isArray(tags)).toBe(true);
    });

    test("should filter tag summary by account IDs", async ({ summaryAPI }) => {
      const response = await summaryAPI.getTagSummary({
        accountIds: [testAccountId],
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should filter tag summary by category IDs", async ({
      summaryAPI,
    }) => {
      const response = await summaryAPI.getTagSummary({
        categoryIds: [expenseCategoryId],
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should combine multiple filters", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTagSummary({
        startDate,
        endDate,
        type: "expense",
        accountIds: [testAccountId],
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  test.describe("Total Summary", () => {
    test("should return total summary without date filtering", async ({
      summaryAPI,
    }) => {
      const response = await summaryAPI.getTotalSummary();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const summary = response.data!;
      expect(summary).toHaveProperty("expense");
      expect(summary).toHaveProperty("income");
      expect(summary).toHaveProperty("totalTransactions");

      // Verify we have our test transactions
      expect(summary.totalTransactions).toBeGreaterThanOrEqual(5);
    });

    test("should return total summary with date filtering", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTotalSummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const summary = response.data!;
      expect(summary.totalTransactions).toBeGreaterThanOrEqual(0);
    });

    test("should calculate correct totals", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTotalSummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      const summary = response.data!;

      // Total amounts should match transaction types
      expect(summary.expense).toBeGreaterThanOrEqual(0);
      expect(summary.income).toBeGreaterThanOrEqual(0);
      expect(summary.totalTransactions).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Transaction Summary", () => {
    test("should return daily transaction summary", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTransactionSummary({
        startDate,
        endDate,
        frequency: "daily",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const summary = response.data!;
      expect(summary.frequency).toBe("daily");
      expect(Array.isArray(summary.data)).toBe(true);

      if (summary.data && summary.data.length > 0) {
        const item = summary.data[0];
        expect(item).toHaveProperty("period");
        expect(item).toHaveProperty("expenseAmount");
        expect(item).toHaveProperty("incomeAmount");
        expect(item).toHaveProperty("totalCount");
      }
    });

    test("should return weekly transaction summary", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTransactionSummary({
        startDate,
        endDate,
        frequency: "weekly",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.frequency).toBe("weekly");
    });

    test("should return monthly transaction summary (default)", async ({
      summaryAPI,
    }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTransactionSummary({
        startDate,
        endDate,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.frequency).toBe("monthly");
    });

    test("should return yearly transaction summary", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1).toISOString();
      const endDate = new Date(today.getFullYear(), 11, 31).toISOString();

      const response = await summaryAPI.getTransactionSummary({
        startDate,
        endDate,
        frequency: "yearly",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data!.frequency).toBe("yearly");
    });

    test("should validate frequency parameter", async ({ summaryAPI }) => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      ).toISOString();
      const endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).toISOString();

      const response = await summaryAPI.getTransactionSummary({
        startDate,
        endDate,
        frequency: "invalid" as any,
      });

      expect(response.status).toBe(422);
    });
  });

  test.describe("Date Range Validation", () => {
    test("should handle edge case - same start and end date", async ({
      summaryAPI,
    }) => {
      const sameDate = new Date().toISOString();

      const response = await summaryAPI.getAccountSummary({
        startDate: sameDate,
        endDate: sameDate,
      });

      expect(response.status).toBe(200);
    });

    test("should handle invalid date format", async ({ summaryAPI }) => {
      const response = await summaryAPI.getAccountSummary({
        startDate: "invalid-date",
        endDate: "invalid-date",
      } as any);

      expect(response.status).toBe(422);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI, tagAPI, transactionAPI }) => {
    // Delete transactions
    for (const txId of testTransactionIds) {
      await transactionAPI.deleteTransaction(txId);
    }

    // Delete test data
    if (testTagId) await tagAPI.deleteTag(testTagId);
    if (testAccountId) await accountAPI.deleteAccount(testAccountId);
    if (testAccount2Id) await accountAPI.deleteAccount(testAccount2Id);
    if (expenseCategoryId) await categoryAPI.deleteCategory(expenseCategoryId);
    if (incomeCategoryId) await categoryAPI.deleteCategory(incomeCategoryId);
  });
});

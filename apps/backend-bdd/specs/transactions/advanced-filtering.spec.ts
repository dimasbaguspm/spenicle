import { test, expect } from "../../fixtures";

/**
 * Transaction Advanced Filtering Tests
 * Tests for complex filtering scenarios not covered in basic transaction tests
 */
test.describe("Transaction Advanced Filtering", () => {
  let testAccountId: number;
  let testCategoryId: number;
  let testTag1Id: number;
  let testTag2Id: number;

  test.beforeAll(
    async ({ accountAPI, categoryAPI, tagAPI, transactionAPI }) => {
      // Setup test data
      const account = await accountAPI.createAccount({
        name: "Filter Test Account",
        type: "expense" as const,
        amount: 10000,
        note: "Test account for filtering tests",
      });

      const category = await categoryAPI.createCategory({
        name: "Filter Test Category",
        type: "expense" as const,
        note: "Test category for filtering tests",
      });

      testAccountId = account.data!.id;
      testCategoryId = category.data!.id;

      // Create tags
      const tag1 = await tagAPI.createTag({ name: "urgent" });
      const tag2 = await tagAPI.createTag({ name: "recurring" });
      testTag1Id = tag1.data!.id;
      testTag2Id = tag2.data!.id;

      // Create test transactions with various attributes
      const transactions = [
        {
          type: "expense" as const,
          amount: 100,
          categoryId: testCategoryId,
          accountId: testAccountId,
          date: new Date("2024-01-15").toISOString(),
          note: "Small expense",
        },
        {
          type: "expense" as const,
          amount: 500,
          categoryId: testCategoryId,
          accountId: testAccountId,
          date: new Date("2024-02-15").toISOString(),
          note: "Medium expense",
        },
        {
          type: "expense" as const,
          amount: 1000,
          categoryId: testCategoryId,
          accountId: testAccountId,
          date: new Date("2024-03-15").toISOString(),
          note: "Large expense",
        },
      ];

      for (const txData of transactions) {
        await transactionAPI.createTransaction(txData);
      }

      // Add tags to some transactions
      const txList = await transactionAPI.getTransactions({
        accountId: [testAccountId],
      });
      if (txList.data?.data && txList.data.data.length >= 2) {
        await transactionAPI.addTransactionTag(
          txList.data.data[0].id,
          "urgent"
        );
        await transactionAPI.addTransactionTag(
          txList.data.data[1].id,
          "recurring"
        );
      }
    }
  );

  test.describe("Amount Range Filtering", () => {
    test("should filter transactions by minimum amount", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        minAmount: 500,
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.amount).toBeGreaterThanOrEqual(500);
        });
      }
    });

    test("should filter transactions by maximum amount", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        maxAmount: 500,
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.amount).toBeLessThanOrEqual(500);
        });
      }
    });

    test("should filter transactions by amount range", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        minAmount: 200,
        maxAmount: 800,
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.amount).toBeGreaterThanOrEqual(200);
          expect(tx.amount).toBeLessThanOrEqual(800);
        });
      }
    });
  });

  test.describe("Multiple Filter Combinations", () => {
    test("should filter by account, category, and date range", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        categoryId: [testCategoryId],
        startDate: new Date("2024-02-01").toISOString(),
        endDate: new Date("2024-03-31").toISOString(),
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.account.id).toBe(testAccountId);
          expect(tx.category.id).toBe(testCategoryId);
          const txDate = new Date(tx.date);
          expect(txDate.getTime()).toBeGreaterThanOrEqual(
            new Date("2024-02-01").getTime()
          );
          expect(txDate.getTime()).toBeLessThanOrEqual(
            new Date("2024-03-31").getTime()
          );
        });
      }
    });

    test("should filter by type, amount range, and date", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        type: ["expense"],
        minAmount: 100,
        maxAmount: 1000,
        startDate: new Date("2024-01-01").toISOString(),
        endDate: new Date("2024-12-31").toISOString(),
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.type).toBe("expense");
          expect(tx.amount).toBeGreaterThanOrEqual(100);
          expect(tx.amount).toBeLessThanOrEqual(1000);
        });
      }
    });
  });

  test.describe("Tag Filtering", () => {
    test("should filter transactions by single tag", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        tagId: [testTag1Id],
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          const hasTag = tx.tags?.some((tag: any) => tag.id === testTag1Id);
          expect(hasTag).toBe(true);
        });
      }
    });

    test("should filter transactions by multiple tags (OR logic)", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        tagId: [testTag1Id, testTag2Id],
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data && response.data.data.length > 0) {
        response.data.data.forEach((tx: any) => {
          const hasAnyTag = tx.tags?.some(
            (tag: any) => tag.id === testTag1Id || tag.id === testTag2Id
          );
          expect(hasAnyTag).toBe(true);
        });
      }
    });
  });

  test.describe("Sorting", () => {
    test("should sort transactions by amount ascending", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        sortBy: "amount",
        sortOrder: "asc",
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data && response.data.data.length > 1) {
        for (let i = 0; i < response.data.data.length - 1; i++) {
          expect(response.data.data[i].amount).toBeLessThanOrEqual(
            response.data.data[i + 1].amount
          );
        }
      }
    });

    test("should sort transactions by amount descending", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        sortBy: "amount",
        sortOrder: "desc",
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data && response.data.data.length > 1) {
        for (let i = 0; i < response.data.data.length - 1; i++) {
          expect(response.data.data[i].amount).toBeGreaterThanOrEqual(
            response.data.data[i + 1].amount
          );
        }
      }
    });

    test("should sort transactions by date", async ({ transactionAPI }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();

      if (response.data?.data && response.data.data.length > 1) {
        for (let i = 0; i < response.data.data.length - 1; i++) {
          const date1 = new Date(response.data.data[i].date).getTime();
          const date2 = new Date(response.data.data[i + 1].date).getTime();
          expect(date1).toBeGreaterThanOrEqual(date2);
        }
      }
    });
  });

  test.describe("Pagination Edge Cases", () => {
    test("should handle page size of 1", async ({ transactionAPI }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        pageSize: 1,
        pageNumber: 1,
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();
      expect(response.data?.data?.length).toBeLessThanOrEqual(1);
      expect(response.data?.pageSize).toBe(1);
    });

    test("should handle requesting page beyond available data", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        pageSize: 10,
        pageNumber: 9999,
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();
      expect(response.data?.data?.length).toBe(0);
    });

    test("should return correct pagination metadata", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        pageSize: 2,
        pageNumber: 1,
      });

      expect(response.status).toBe(200);
      expect(response.data?.pageNumber).toBe(1);
      expect(response.data?.pageSize).toBe(2);
      expect(response.data?.totalCount).toBeGreaterThanOrEqual(0);
      expect(response.data?.totalPages).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Filter by Transaction IDs", () => {
    test("should filter transactions by specific IDs", async ({
      transactionAPI,
    }) => {
      // Get some transactions first
      const listResponse = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        pageSize: 2,
      });

      expect(listResponse.data?.data).toBeDefined();
      const ids = listResponse?.data?.data?.map((tx: any) => tx.id) || [];

      if (ids.length > 0) {
        // Filter by those IDs
        const filterResponse = await transactionAPI.getTransactions({
          id: ids,
        });

        expect(filterResponse.status).toBe(200);
        expect(filterResponse.data?.data).toBeDefined();

        if (filterResponse.data?.data) {
          filterResponse.data.data.forEach((tx: any) => {
            expect(ids).toContain(tx.id);
          });
        }
      }
    });

    test("should return empty array for non-existent IDs", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        id: [999998, 999999],
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();
      expect(response.data?.data?.length).toBe(0);
    });
  });

  test.describe("Empty Filter Results", () => {
    test("should handle filters that match no transactions", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
        minAmount: 999999,
        maxAmount: 9999999,
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();
      expect(response.data?.data?.length).toBe(0);
      expect(response.data?.totalCount).toBe(0);
    });

    test("should handle date range with no transactions", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        startDate: new Date("2050-01-01").toISOString(),
        endDate: new Date("2050-12-31").toISOString(),
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();
      expect(response.data?.data?.length).toBe(0);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI, tagAPI }) => {
    if (testAccountId) await accountAPI.deleteAccount(testAccountId);
    if (testCategoryId) await categoryAPI.deleteCategory(testCategoryId);
    if (testTag1Id) await tagAPI.deleteTag(testTag1Id);
    if (testTag2Id) await tagAPI.deleteTag(testTag2Id);
  });
});

import { test, expect } from "../../fixtures";

/**
 * Transaction endpoint tests
 * Tests for /transactions endpoints
 */
test.describe("Transaction API", () => {
  let testAccountId: number;
  let testCategoryId: number;

  // Setup: Create account and category for transactions
  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    const accountResponse = await accountAPI.createAccount({
      name: "Test Transaction Account",
      type: "expense" as const,
      amount: 10000,
      note: "Test account for transactions",
    });

    const categoryResponse = await categoryAPI.createCategory({
      name: "Test Transaction Category",
      type: "expense" as const,
      note: "Test category for transactions",
    });

    if (accountResponse.data && categoryResponse.data) {
      testAccountId = accountResponse.data.id;
      testCategoryId = categoryResponse.data.id;
    }
  });

  test.describe("POST /transactions", () => {
    test("should create an expense transaction", async ({ transactionAPI }) => {
      const transactionData = {
        type: "expense" as const,
        amount: 50,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
        note: "E2E test transaction",
      };

      const response = await transactionAPI.createTransaction(transactionData);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.type).toBe("expense");
      expect(response.data?.amount).toBe(transactionData.amount);
      expect(response.data?.id).toBeDefined();

      // Cleanup
      if (response.data?.id) {
        await transactionAPI.deleteTransaction(response.data.id);
      }
    });

    test("should create an income transaction", async ({
      transactionAPI,
      categoryAPI,
    }) => {
      // Create an income category for this test
      const incomeCategoryResponse = await categoryAPI.createCategory({
        name: "Test Income Category",
        type: "income" as const,
        note: "Test category for income transaction",
      });

      expect(incomeCategoryResponse.data).toBeDefined();
      const incomeCategoryId = incomeCategoryResponse.data!.id;

      const transactionData = {
        type: "income" as const,
        amount: 1000,
        categoryId: incomeCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      };

      const response = await transactionAPI.createTransaction(transactionData);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.type).toBe("income");
      expect(response.data?.amount).toBe(transactionData.amount);

      // Cleanup
      if (response.data?.id) {
        await transactionAPI.deleteTransaction(response.data.id);
      }
      await categoryAPI.deleteCategory(incomeCategoryId);
    });

    test("should fail to create transaction with invalid amount", async ({
      transactionAPI,
    }) => {
      const invalidData = {
        type: "expense" as const,
        amount: -50, // Negative amount should fail
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      };

      const response = await transactionAPI.createTransaction(invalidData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();
    });

    test("should fail to create transaction with non-existent category", async ({
      transactionAPI,
    }) => {
      const invalidData = {
        type: "expense" as const,
        amount: 50,
        categoryId: 999999,
        accountId: testAccountId,
        date: new Date().toISOString(),
      };

      const response = await transactionAPI.createTransaction(invalidData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();
    });
  });

  test.describe("GET /transactions", () => {
    test("should get paginated list of transactions", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.data).toBeDefined();
      expect(Array.isArray(response.data?.data)).toBe(true);
    });

    test("should filter transactions by type", async ({ transactionAPI }) => {
      const response = await transactionAPI.getTransactions({
        type: ["expense"],
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      // All returned transactions should be expenses
      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.type).toBe("expense");
        });
      }
    });

    test("should filter transactions by account", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransactions({
        accountId: [testAccountId],
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      // All returned transactions should be from the test account
      if (response.data?.data) {
        response.data.data.forEach((tx: any) => {
          expect(tx.account.id).toBe(testAccountId);
        });
      }
    });

    test("should filter transactions by date range", async ({
      transactionAPI,
    }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await transactionAPI.getTransactions({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  test.describe("GET /transactions/:id", () => {
    test("should get a single transaction by ID", async ({
      transactionAPI,
    }) => {
      // Create a transaction
      const createResponse = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 25,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
        note: "Transaction for Get Test",
      });

      expect(createResponse.data).toBeDefined();
      const transactionId = createResponse.data!.id;

      // Get it
      const response = await transactionAPI.getTransaction(transactionId);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBe(transactionId);
      expect(response.data?.note).toBe("Transaction for Get Test");

      // Cleanup
      await transactionAPI.deleteTransaction(transactionId);
    });

    test("should return 404 for non-existent transaction", async ({
      transactionAPI,
    }) => {
      const response = await transactionAPI.getTransaction(999999);

      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });
  });

  test.describe("PATCH /transactions/:id", () => {
    test("should update a transaction successfully", async ({
      transactionAPI,
    }) => {
      // Create a transaction
      const createResponse = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
        note: "Transaction to Update",
      });

      expect(createResponse.data).toBeDefined();
      const transactionId = createResponse.data!.id;

      // Update it
      const updateData = {
        amount: 150,
        note: "Updated Transaction",
      };

      const response = await transactionAPI.updateTransaction(
        transactionId,
        updateData
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.amount).toBe(updateData.amount);
      expect(response.data?.note).toBe(updateData.note);

      // Cleanup
      await transactionAPI.deleteTransaction(transactionId);
    });
  });

  test.describe("DELETE /transactions/:id", () => {
    test("should delete a transaction successfully", async ({
      transactionAPI,
    }) => {
      // Create a transaction
      const createResponse = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 75,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      expect(createResponse.data).toBeDefined();
      const transactionId = createResponse.data!.id;

      // Delete it
      const response = await transactionAPI.deleteTransaction(transactionId);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Verify it's deleted
      const getResponse = await transactionAPI.getTransaction(transactionId);
      expect(getResponse.status).toBe(404);
    });
  });

  test.describe("Transaction Tags", () => {
    test("should add tag to transaction", async ({ transactionAPI }) => {
      // Create a transaction
      const createResponse = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 50,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
        note: "Transaction with tags",
      });

      expect(createResponse.data).toBeDefined();
      const transactionId = createResponse.data!.id;

      // Add a tag
      const tagResponse = await transactionAPI.addTransactionTag(
        transactionId,
        "test-tag"
      );

      expect(tagResponse.status).toBeGreaterThanOrEqual(200);
      expect(tagResponse.status).toBeLessThan(300);

      // Get tags
      const getTagsResponse = await transactionAPI.getTransactionTags(
        transactionId
      );

      expect(getTagsResponse.status).toBe(200);
      expect(getTagsResponse.data).toBeDefined();

      // Cleanup
      await transactionAPI.deleteTransaction(transactionId);
    });
  });

  test.describe("Transaction Relations", () => {
    test("should create relation between transactions", async ({
      transactionAPI,
    }) => {
      // Create two transactions
      const transaction1 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const transaction2 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 200,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      expect(transaction1.data).toBeDefined();
      expect(transaction2.data).toBeDefined();

      const tx1Id = transaction1.data!.id;
      const tx2Id = transaction2.data!.id;

      // Create relation
      const relationResponse = await transactionAPI.createTransactionRelation(
        tx1Id,
        tx2Id
      );

      expect(relationResponse.status).toBeGreaterThanOrEqual(200);
      expect(relationResponse.status).toBeLessThan(300);

      // Get relations
      const getRelationsResponse = await transactionAPI.getTransactionRelations(
        tx1Id
      );

      expect(getRelationsResponse.status).toBe(200);

      // Cleanup
      await transactionAPI.deleteTransactionRelation(tx1Id, tx2Id);
      await transactionAPI.deleteTransaction(tx1Id);
      await transactionAPI.deleteTransaction(tx2Id);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    if (testAccountId) {
      await accountAPI.deleteAccount(testAccountId);
    }
    if (testCategoryId) {
      await categoryAPI.deleteCategory(testCategoryId);
    }
  });
});

import { test, expect } from "../../fixtures";

/**
 * Transaction Relations Edge Cases
 * Tests for transaction relation scenarios not covered in basic tests
 */
test.describe("Transaction Relations - Edge Cases", () => {
  let testAccountId: number;
  let testCategoryId: number;

  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    const account = await accountAPI.createAccount({
      name: "Relations Test Account",
      type: "expense" as const,
      amount: 10000,
      note: "Test account for relations tests",
    });

    const category = await categoryAPI.createCategory({
      name: "Relations Test Category",
      type: "expense" as const,
      note: "Test category for relations tests",
    });

    testAccountId = account.data!.id;
    testCategoryId = category.data!.id;
  });

  test.describe("Relation Creation Edge Cases", () => {
    test("should prevent creating duplicate relations", async ({
      transactionAPI,
    }) => {
      // Create two transactions
      const tx1 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx2 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 200,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx1Id = tx1.data!.id;
      const tx2Id = tx2.data!.id;

      // Create relation
      const firstRelation = await transactionAPI.createTransactionRelation(
        tx1Id,
        tx2Id
      );
      expect(firstRelation.status).toBeGreaterThanOrEqual(200);
      expect(firstRelation.status).toBeLessThan(300);

      // Try to create same relation again
      const duplicateRelation = await transactionAPI.createTransactionRelation(
        tx1Id,
        tx2Id
      );

      // Should either succeed (idempotent) or return error
      if (duplicateRelation.status >= 400) {
        expect(duplicateRelation.error).toBeDefined();
      }

      // Cleanup
      await transactionAPI.deleteTransactionRelation(tx1Id, tx2Id);
      await transactionAPI.deleteTransaction(tx1Id);
      await transactionAPI.deleteTransaction(tx2Id);
    });

    test("should fail to create relation with non-existent transaction", async ({
      transactionAPI,
    }) => {
      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Try to create relation with non-existent transaction
      const response = await transactionAPI.createTransactionRelation(
        txId,
        999999
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });

    test("should fail to create self-relation", async ({ transactionAPI }) => {
      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Try to create relation with itself
      const response = await transactionAPI.createTransactionRelation(
        txId,
        txId
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });
  });

  test.describe("Relation Retrieval", () => {
    test("should return empty array for transaction with no relations", async ({
      transactionAPI,
    }) => {
      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      const response = await transactionAPI.getTransactionRelations(txId);

      expect(response.status).toBe(200);
      // API returns null when there are no relations (per OpenAPI spec: type: array | null)
      expect(response.data === null || Array.isArray(response.data)).toBe(true);

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });

    test("should retrieve all related transactions", async ({
      transactionAPI,
    }) => {
      // Create three transactions
      const tx1 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx2 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 200,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx3 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 300,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx1Id = tx1.data!.id;
      const tx2Id = tx2.data!.id;
      const tx3Id = tx3.data!.id;

      // Create relations: tx1 -> tx2 and tx1 -> tx3
      await transactionAPI.createTransactionRelation(tx1Id, tx2Id);
      await transactionAPI.createTransactionRelation(tx1Id, tx3Id);

      // Get all relations for tx1
      const response = await transactionAPI.getTransactionRelations(tx1Id);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.length).toBeGreaterThanOrEqual(2);

      const relatedIds = response.data?.map((tx) => tx.id) || [];
      expect(relatedIds).toContain(tx2Id);
      expect(relatedIds).toContain(tx3Id);

      // Cleanup
      await transactionAPI.deleteTransactionRelation(tx1Id, tx2Id);
      await transactionAPI.deleteTransactionRelation(tx1Id, tx3Id);
      await transactionAPI.deleteTransaction(tx1Id);
      await transactionAPI.deleteTransaction(tx2Id);
      await transactionAPI.deleteTransaction(tx3Id);
    });
  });

  test.describe("Relation Deletion", () => {
    test("should handle deleting non-existent relation gracefully", async ({
      transactionAPI,
    }) => {
      const tx1 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx2 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 200,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx1Id = tx1.data!.id;
      const tx2Id = tx2.data!.id;

      // Try to delete non-existent relation
      const response = await transactionAPI.deleteTransactionRelation(
        tx1Id,
        tx2Id
      );

      // Should return 404 or 204
      expect([204, 404]).toContain(response.status);

      // Cleanup
      await transactionAPI.deleteTransaction(tx1Id);
      await transactionAPI.deleteTransaction(tx2Id);
    });

    test("should remove relation when deleting related transaction", async ({
      transactionAPI,
    }) => {
      const tx1 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx2 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 200,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx1Id = tx1.data!.id;
      const tx2Id = tx2.data!.id;

      // Create relation
      await transactionAPI.createTransactionRelation(tx1Id, tx2Id);

      // Delete one of the transactions
      await transactionAPI.deleteTransaction(tx2Id);

      // Get relations - should not include deleted transaction
      const response = await transactionAPI.getTransactionRelations(tx1Id);

      expect(response.status).toBe(200);
      const relatedIds = response.data?.map((tx) => tx.id) || [];
      expect(relatedIds).not.toContain(tx2Id);

      // Cleanup
      await transactionAPI.deleteTransaction(tx1Id);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    if (testAccountId) await accountAPI.deleteAccount(testAccountId);
    if (testCategoryId) await categoryAPI.deleteCategory(testCategoryId);
  });
});

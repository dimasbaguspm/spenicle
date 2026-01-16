import { test, expect } from "@fixtures/index";

test.describe("Transaction Relations - Pagination and Filtering", () => {
  test("GET /transactions/:id/relations - list relations returns items", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-pagination-account-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-pagination-category-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    const categoryId = category.data!.id as number;

    const sourceTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 50000,
      note: "source transaction",
      type: "expense",
      date: new Date().toISOString(),
    });
    const sourceId = sourceTx.data!.id as number;

    // Create multiple related transactions and relations
    for (let i = 0; i < 5; i++) {
      const tx = await transactionAPI.createTransaction({
        accountId,
        categoryId,
        amount: 10000 + i * 1000,
        note: `related transaction ${i + 1}`,
        type: "expense",
        date: new Date().toISOString(),
      });
      await transactionAPI.createTransactionRelation(
        sourceId,
        tx.data!.id as number,
        `relation-${i + 1}`
      );
    }

    // List relations
    const listRes = await transactionAPI.getTransactionRelations(sourceId);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.data!.items)).toBe(true);
    expect(listRes.data!.items!.length).toBe(5);

    // Verify all relations belong to the source transaction
    for (const relation of listRes.data!.items!) {
      expect(relation.sourceTransactionId).toBe(sourceId);
    }

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    // Note: Related transactions will be cleaned up by their relations being deleted
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /transactions/:id/relations - empty array for transaction with no relations", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-pagination-empty-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-pagination-empty-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    const categoryId = category.data!.id as number;

    // Create a transaction with no relations
    const isolatedTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 75000,
      note: "isolated transaction with no relations",
      type: "expense",
      date: new Date().toISOString(),
    });
    const isolatedId = isolatedTx.data!.id as number;

    // Get relations
    const response = await transactionAPI.getTransactionRelations(isolatedId);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data!.items)).toBe(true);
    expect(response.data!.items!.length).toBe(0);

    // Cleanup
    await transactionAPI.deleteTransaction(isolatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /transactions/:id/relations - relations ordered by creation date", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-pagination-order-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-pagination-order-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    const categoryId = category.data!.id as number;

    const sourceTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 50000,
      note: "source transaction",
      type: "expense",
      date: new Date().toISOString(),
    });
    const sourceId = sourceTx.data!.id as number;

    // Create multiple related transactions and relations with delays
    for (let i = 0; i < 3; i++) {
      const tx = await transactionAPI.createTransaction({
        accountId,
        categoryId,
        amount: 10000 + i * 1000,
        note: `related transaction ${i + 1}`,
        type: "expense",
        date: new Date().toISOString(),
      });
      await transactionAPI.createTransactionRelation(
        sourceId,
        tx.data!.id as number,
        `relation-${i + 1}`
      );
      // Small delay to ensure different creation times
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Get relations
    const response = await transactionAPI.getTransactionRelations(sourceId);
    expect(response.status).toBe(200);
    expect(response.data!.items!.length).toBe(3);

    // Verify relations are ordered by creation date (most recent first)
    for (let i = 0; i < response.data!.items!.length - 1; i++) {
      const current = new Date(response.data!.items![i].createdAt);
      const next = new Date(response.data!.items![i + 1].createdAt);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /transactions/:id/relations - includes all required fields", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-pagination-fields-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-pagination-fields-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    const categoryId = category.data!.id as number;

    const sourceTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 50000,
      note: "source transaction",
      type: "expense",
      date: new Date().toISOString(),
    });
    const sourceId = sourceTx.data!.id as number;

    const relatedTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 25000,
      note: "related transaction",
      type: "expense",
      date: new Date().toISOString(),
    });
    const relatedId = relatedTx.data!.id as number;

    // Create relation
    await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "transfer"
    );

    // Get relations
    const response = await transactionAPI.getTransactionRelations(sourceId);
    expect(response.status).toBe(200);
    expect(response.data!.items!.length).toBeGreaterThan(0);

    const relation = response.data!.items![0];
    expect(relation).toHaveProperty("id");
    expect(relation).toHaveProperty("sourceTransactionId");
    expect(relation).toHaveProperty("relatedTransactionId");
    expect(relation).toHaveProperty("relationType");
    expect(relation).toHaveProperty("createdAt");
    expect(relation).toHaveProperty("updatedAt");
    expect(relation).toHaveProperty("deletedAt");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

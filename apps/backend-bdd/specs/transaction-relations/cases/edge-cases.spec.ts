import { test, expect } from "@fixtures/index";

test.describe("Transaction Relations - Edge Cases", () => {
  test("multiple relations for one transaction", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-edge-multiple-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-edge-multiple-${Date.now()}`,
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

    // Create multiple related transactions
    const relatedIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const tx = await transactionAPI.createTransaction({
        accountId,
        categoryId,
        amount: 10000 + i * 5000,
        note: `related transaction ${i + 1}`,
        type: "expense",
        date: new Date().toISOString(),
      });
      relatedIds.push(tx.data!.id as number);
    }

    // Create multiple relations
    for (let i = 0; i < relatedIds.length; i++) {
      await transactionAPI.createTransactionRelation(
        sourceId,
        relatedIds[i],
        `relation-${i + 1}`
      );
    }

    // Verify all relations exist
    const relationsResponse = await transactionAPI.getTransactionRelations(
      sourceId
    );
    expect(relationsResponse.status).toBeGreaterThanOrEqual(200);
    expect(relationsResponse.data!.items!.length).toBe(3);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    for (const id of relatedIds) {
      await transactionAPI.deleteTransaction(id);
    }
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("bidirectional relations", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-edge-bidirectional-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-edge-bidirectional-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    const categoryId = category.data!.id as number;

    const tx1 = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 50000,
      note: "transaction 1",
      type: "expense",
      date: new Date().toISOString(),
    });
    const tx1Id = tx1.data!.id as number;

    const tx2 = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 25000,
      note: "transaction 2",
      type: "expense",
      date: new Date().toISOString(),
    });
    const tx2Id = tx2.data!.id as number;

    // Create relation tx1 -> tx2
    await transactionAPI.createTransactionRelation(tx1Id, tx2Id, "forward");

    // Create relation tx2 -> tx1 (different relation type)
    await transactionAPI.createTransactionRelation(tx2Id, tx1Id, "reverse");

    // Verify both relations exist
    const relations1 = await transactionAPI.getTransactionRelations(tx1Id);
    const relations2 = await transactionAPI.getTransactionRelations(tx2Id);

    expect(relations1.data!.items!.length).toBe(1);
    expect(relations2.data!.items!.length).toBe(1);
    expect(relations1.data!.items![0].relatedTransactionId).toBe(tx2Id);
    expect(relations2.data!.items![0].relatedTransactionId).toBe(tx1Id);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1Id);
    await transactionAPI.deleteTransaction(tx2Id);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("delete non-existent relation returns 404", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-edge-delete-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-edge-delete-${Date.now()}`,
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

    // Try to delete relation that doesn't exist
    const deleteRes = await transactionAPI.deleteTransactionRelation(
      sourceId,
      relatedId
    );
    expect(deleteRes.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("long relation type strings", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-edge-long-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-edge-long-${Date.now()}`,
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

    const longRelationType = "a".repeat(255); // Max length string

    // Create relation with long type
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      longRelationType
    );
    expect(res.status).toBeGreaterThanOrEqual(400); // Should reject long relation types

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("special characters in relation type", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-edge-special-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-edge-special-${Date.now()}`,
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

    const specialRelationType = "type_with_underscores-and-dashes.123";

    // Create relation with special characters
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      specialRelationType
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe(specialRelationType);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

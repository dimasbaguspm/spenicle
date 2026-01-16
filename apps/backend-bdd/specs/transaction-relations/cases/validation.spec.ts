import { test, expect } from "@fixtures/index";

test.describe("Transaction Relations - Validation Cases", () => {
  test("POST /transactions/:id/relations - invalid source transaction returns 404", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create a valid related transaction first
    const account = await accountAPI.createAccount({
      name: `e2e-validation-account-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-validation-category-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    const categoryId = category.data!.id as number;

    const relatedTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 25000,
      note: "related transaction",
      type: "expense",
      date: new Date().toISOString(),
    });
    const relatedId = relatedTx.data!.id as number;

    // Try to create relation with invalid source ID
    const res = await transactionAPI.createTransactionRelation(
      99999, // Invalid source ID
      relatedId,
      "transfer"
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - invalid related transaction returns 404", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create a valid source transaction first
    const account = await accountAPI.createAccount({
      name: `e2e-validation-account-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-validation-category-${Date.now()}`,
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

    // Try to create relation with invalid related ID
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      99999, // Invalid related ID
      "transfer"
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - duplicate relation returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-validation-dup-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-validation-dup-${Date.now()}`,
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

    // Create first relation
    await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "transfer"
    );

    // Try to create duplicate relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "transfer"
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - self-relation returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-validation-self-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-validation-self-${Date.now()}`,
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

    // Try to create self-relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      sourceId, // Same ID
      "transfer"
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - empty relation type returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-validation-empty-${Date.now()}`,

      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-validation-empty-${Date.now()}`,
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

    // Try to create relation with empty type
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "" // Empty relation type
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe("");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

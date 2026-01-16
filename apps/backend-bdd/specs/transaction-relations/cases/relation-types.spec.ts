import { test, expect } from "@fixtures/index";

test.describe("Transaction Relations - Relation Types", () => {
  test("POST /transactions/:id/relations - transfer relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-transfer-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-transfer-${Date.now()}`,
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

    // Create transfer relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "transfer"
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe("transfer");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - split relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-split-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-split-${Date.now()}`,
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

    // Create split relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "split"
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe("split");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - refund relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-refund-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-refund-${Date.now()}`,
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

    // Create refund relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "refund"
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe("refund");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - adjustment relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-adjustment-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-adjustment-${Date.now()}`,
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

    // Create adjustment relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "adjustment"
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe("adjustment");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions/:id/relations - correction relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-correction-${Date.now()}`,
      type: "expense",
      note: "test account",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-correction-${Date.now()}`,
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

    // Create correction relation
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "correction"
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data!.relationType).toBe("correction");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Transaction Relations - Common CRUD", () => {
  test("POST /transactions/:id/relations - create relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    expect(account.status).toBe(200);
    expect(account.data).toBeDefined();
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-category-${Date.now()}`,
      type: "expense",
      note: "test category",
    });
    expect(category.status).toBe(200);
    expect(category.data).toBeDefined();
    const categoryId = category.data!.id as number;

    const sourceTx = await transactionAPI.createTransaction({
      accountId,
      categoryId,
      amount: 50000,
      note: "source transaction",
      type: "expense",
      date: new Date().toISOString(),
    });
    expect(sourceTx.status).toBe(200);
    expect(sourceTx.data).toBeDefined();
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
    const res = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "transfer"
    );
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.sourceTransactionId).toBe(sourceId);
    expect(res.data!.relatedTransactionId).toBe(relatedId);
    expect(res.data!.relationType).toBe("transfer");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /transactions/:id/relations - list relations", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-list-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-list-${Date.now()}`,
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

    // List relations
    const listRes = await transactionAPI.getTransactionRelations(sourceId);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.data!.items)).toBe(true);
    expect(listRes.data!.items!.length).toBeGreaterThan(0);

    const relation = listRes.data!.items!.find(
      (r: any) => r.relatedTransactionId === relatedId
    );
    expect(relation).toBeDefined();
    expect(relation!.relationType).toBe("transfer");

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("DELETE /transactions/:id/relations/:relationId - delete relation", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create test data
    const account = await accountAPI.createAccount({
      name: `e2e-relations-delete-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const accountId = account.data!.id as number;

    const category = await categoryAPI.createCategory({
      name: `e2e-relations-delete-${Date.now()}`,
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
    const createRes = await transactionAPI.createTransactionRelation(
      sourceId,
      relatedId,
      "transfer"
    );
    expect(createRes.status).toBe(200);
    const relationId = createRes.data!.id as number;

    // Delete relation
    const deleteRes = await transactionAPI.deleteTransactionRelation(
      sourceId,
      relationId
    );
    expect(deleteRes.status).toBe(204);

    // Verify relation is deleted
    const listRes = await transactionAPI.getTransactionRelations(sourceId);
    expect(listRes.data!.items!.length).toBe(0);

    // Cleanup
    await transactionAPI.deleteTransaction(sourceId);
    await transactionAPI.deleteTransaction(relatedId);
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

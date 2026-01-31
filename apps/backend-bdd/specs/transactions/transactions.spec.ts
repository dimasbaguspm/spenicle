import { test, expect } from "@fixtures/index";

test.describe("Transactions - Common CRUD", () => {
  test("POST /transactions - create transaction (expense)", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const payload = {
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "create tx",
    };

    const res = await transactionAPI.createTransaction(payload);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    const id = res.data!.id as number;

    const getRes = await transactionAPI.getTransaction(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);

    const updateRes = await transactionAPI.updateTransaction(id, {
      note: "patched",
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.note).toBe("patched");

    const delRes = await transactionAPI.deleteTransaction(id);
    expect([200, 204]).toContain(delRes.status);

    // cleanup
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

test.describe("Transactions - Filtering", () => {
  test("GET /transactions - list transactions filtered by accountId includes both source and destination", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create two accounts
    const sourceAcc = await accountAPI.createAccount({
      name: `tx-src-acc-${Date.now()}`,
      note: "source account",
      type: "expense",
    });
    const destAcc = await accountAPI.createAccount({
      name: `tx-dest-acc-${Date.now()}`,
      note: "destination account",
      type: "expense",
    });

    // Create a category for the transfer
    const cat = await categoryAPI.createCategory({
      name: `tx-cat-${Date.now()}`,
      note: "transfer category",
      type: "expense",
    });

    // Create a transfer transaction from source to destination
    const transferPayload = {
      accountId: sourceAcc.data!.id as number,
      destinationAccountId: destAcc.data!.id as number,
      categoryId: cat.data!.id as number,
      amount: 500,
      date: new Date().toISOString(),
      type: "transfer" as const,
      note: "transfer test",
    };

    const transferRes = await transactionAPI.createTransaction(transferPayload);
    expect(transferRes.status).toBe(200);
    const transferId = transferRes.data!.id as number;

    // Query transactions for source account - should include the transfer
    const sourceListRes = await transactionAPI.getTransactions({
      accountId: [sourceAcc.data!.id as number],
    });
    expect(sourceListRes.status).toBe(200);
    const sourceItems = sourceListRes.data!.items || [];
    const sourceTransfer = sourceItems.find((tx) => tx.id === transferId);
    expect(sourceTransfer).toBeDefined();
    expect(sourceTransfer!.account.id).toBe(sourceAcc.data!.id);
    expect(sourceTransfer!.destinationAccount!.id).toBe(destAcc.data!.id);

    // Query transactions for destination account - should include the transfer
    const destListRes = await transactionAPI.getTransactions({
      accountId: [destAcc.data!.id as number],
    });
    expect(destListRes.status).toBe(200);
    const destItems = destListRes.data!.items || [];
    const destTransfer = destItems.find((tx) => tx.id === transferId);
    expect(destTransfer).toBeDefined();
    expect(destTransfer!.account.id).toBe(sourceAcc.data!.id);
    expect(destTransfer!.destinationAccount!.id).toBe(destAcc.data!.id);

    // Cleanup
    await transactionAPI.deleteTransaction(transferId);
    await accountAPI.deleteAccount(sourceAcc.data!.id as number);
    await accountAPI.deleteAccount(destAcc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

test.describe("Transactions - Template Embedding", () => {
  test("GET /transactions/{id} - get transaction includes template field", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const payload = {
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "create tx",
    };

    const res = await transactionAPI.createTransaction(payload);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    const id = res.data!.id as number;

    const getRes = await transactionAPI.getTransaction(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);
    expect(getRes.data).toHaveProperty("template");
    expect(getRes.data!.template).toBeNull();

    // cleanup
    await transactionAPI.deleteTransaction(id);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

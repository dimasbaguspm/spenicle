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

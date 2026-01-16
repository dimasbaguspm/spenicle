import { test, expect } from "@fixtures/index";

test.describe("Transactions - Delete Revert", () => {
  test("deleting a transaction reverts the balance change", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `d-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `d-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const create = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 2000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(create.status).toBeGreaterThanOrEqual(200);
    const tid = create.data!.id as number;

    const mid = await accountAPI.getAccount(acc.data!.id as number);
    expect(mid.data!.amount).toBe(-2000);

    const del = await transactionAPI.deleteTransaction(tid);
    expect([200, 204]).toContain(del.status);

    const after = await accountAPI.getAccount(acc.data!.id as number);
    expect(after.data!.amount).toBe(0);

    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("deleting a transfer reverts both accounts' balances", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `del-t-acc1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `del-t-acc2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `del-t-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const create = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 500,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "transfer" as const,
      destinationAccountId: a2.data!.id as number,
    } as any);
    expect(create.status).toBeGreaterThanOrEqual(200);
    const tid = create.data!.id as number;

    const mid1 = await accountAPI.getAccount(a1.data!.id as number);
    const mid2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(mid1.data!.amount).toBe(-500);
    expect(mid2.data!.amount).toBe(500);

    const del = await transactionAPI.deleteTransaction(tid);
    expect([200, 204]).toContain(del.status);

    const after1 = await accountAPI.getAccount(a1.data!.id as number);
    const after2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(after1.data!.amount).toBe(0);
    expect(after2.data!.amount).toBe(0);

    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });
});

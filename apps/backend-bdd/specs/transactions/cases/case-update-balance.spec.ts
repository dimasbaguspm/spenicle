import { test, expect } from "@fixtures/index";

test.describe("Transactions - Update Balance Behavior", () => {
  test("updating a transaction amount and account updates balances accordingly", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `u-acc1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `u-acc2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `u-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const create = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(create.status).toBeGreaterThanOrEqual(200);
    const tid = create.data!.id as number;

    // Update: move to a2 and change amount
    const update = await transactionAPI.updateTransaction(tid, {
      accountId: a2.data!.id as number,
      amount: 3000,
    });
    expect(update.status).toBeGreaterThanOrEqual(200);

    const a1After = await accountAPI.getAccount(a1.data!.id as number);
    const a2After = await accountAPI.getAccount(a2.data!.id as number);

    // a1 should be reverted to 0, a2 should now be -3000
    expect(a1After.data!.amount).toBe(0);
    expect(a2After.data!.amount).toBe(-3000);

    await transactionAPI.deleteTransaction(tid);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("swap two transactions' accounts results in correct balances", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `swap-acc1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `swap-acc2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `swap-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const t1 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    const t2 = await transactionAPI.createTransaction({
      accountId: a2.data!.id as number,
      amount: 200,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });

    // initial balances
    const initA1 = await accountAPI.getAccount(a1.data!.id as number);
    const initA2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(initA1.data!.amount).toBe(-100);
    expect(initA2.data!.amount).toBe(-200);

    // swap accounts by updating each transaction
    const up1 = await transactionAPI.updateTransaction(t1.data!.id as number, {
      accountId: a2.data!.id as number,
    });
    expect(up1.status).toBeGreaterThanOrEqual(200);

    const up2 = await transactionAPI.updateTransaction(t2.data!.id as number, {
      accountId: a1.data!.id as number,
    });
    expect(up2.status).toBeGreaterThanOrEqual(200);

    const afterA1 = await accountAPI.getAccount(a1.data!.id as number);
    const afterA2 = await accountAPI.getAccount(a2.data!.id as number);

    // After swap: a1 should be -200, a2 should be -100
    expect(afterA1.data!.amount).toBe(-200);
    expect(afterA2.data!.amount).toBe(-100);

    // cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

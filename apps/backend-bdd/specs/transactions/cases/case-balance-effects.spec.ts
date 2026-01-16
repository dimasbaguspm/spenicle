import { test, expect } from "@fixtures/index";

test.describe("Transactions - Balance Effects", () => {
  test("expense reduces account balance and income increases it", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `bal-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `bal-cat-e-${Date.now()}`,
      note: "e",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `bal-cat-i-${Date.now()}`,
      note: "i",
      type: "income",
    });

    const expense = {
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: catE.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    };
    const inc = {
      accountId: acc.data!.id as number,
      amount: 2500,
      categoryId: catI.data!.id as number,
      date: new Date().toISOString(),
      type: "income" as const,
    };

    const r1 = await transactionAPI.createTransaction(expense);
    expect(r1.status).toBe(200);

    const mid = await accountAPI.getAccount(acc.data!.id as number);
    expect(mid.status).toBe(200);
    expect(mid.data!.amount).toBe(-1000);

    const r2 = await transactionAPI.createTransaction(inc);
    expect(r2.status).toBe(200);

    const after = await accountAPI.getAccount(acc.data!.id as number);
    expect(after.data!.amount).toBe(1500); // -1000 + 2500

    // cleanup
    await transactionAPI.deleteTransaction(r1.data!.id as number);
    await transactionAPI.deleteTransaction(r2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("multiple transactions sum and delete reverts correctly", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `bal-sum-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `bal-sum-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const t1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    const t2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 200,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    const t3 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });

    const accAfter = await accountAPI.getAccount(acc.data!.id as number);
    expect(accAfter.data!.amount).toBe(-(100 + 200 + 50));

    // delete middle transaction and expect balance to revert by that amount
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    const accAfterDelete = await accountAPI.getAccount(acc.data!.id as number);
    expect(accAfterDelete.data!.amount).toBe(-(100 + 50));

    // cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("future-dated transaction is accepted and affects balance", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `bal-future-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `bal-future-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const future = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000
    ).toISOString();
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 500,
      categoryId: cat.data!.id as number,
      date: future,
      type: "expense" as const,
    });
    expect(tx.status).toBe(200);

    const accAfter = await accountAPI.getAccount(acc.data!.id as number);
    expect(accAfter.data!.amount).toBe(-500);

    // cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

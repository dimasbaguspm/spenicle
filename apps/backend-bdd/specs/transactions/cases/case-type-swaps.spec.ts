import { test, expect } from "@fixtures/index";

test.describe("Transactions - Cases", () => {
  test("transfer -> category change -> make income", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `s1-acc1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `s1-acc2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `s1-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const tx = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "transfer" as const,
      destinationAccountId: a2.data!.id as number,
    } as any);
    expect(tx.status).toBeGreaterThanOrEqual(200);

    const b1 = await accountAPI.getAccount(a1.data!.id as number);
    const b2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(b1.data!.amount).toBe(-100);
    expect(b2.data!.amount).toBe(100);

    const updCat = await categoryAPI.updateCategory(cat.data!.id as number, {
      type: "income",
    });
    expect(updCat.status).toBeGreaterThanOrEqual(200);

    const updTx = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "income" } as any
    );
    expect(updTx.status).toBeGreaterThanOrEqual(200);

    const af1 = await accountAPI.getAccount(a1.data!.id as number);
    const af2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(af1.data!.amount).toBe(100);
    expect(af2.data!.amount).toBe(0);

    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });

  test("exhaustive tx type swaps maintain correct balances", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `s2-a1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `s2-a2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `s2-ce-${Date.now()}`,
      note: "ce",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `s2-ci-${Date.now()}`,
      note: "ci",
      type: "income",
    });

    const tx = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: catE.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx.status).toBeGreaterThanOrEqual(200);

    const toTransfer = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "transfer", destinationAccountId: a2.data!.id as number } as any
    );
    expect(toTransfer.status).toBeGreaterThanOrEqual(200);
    const tA1 = await accountAPI.getAccount(a1.data!.id as number);
    const tA2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(tA1.data!.amount).toBe(-100);
    expect(tA2.data!.amount).toBe(100);

    const toExpense = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "expense", accountId: a1.data!.id as number } as any
    );
    expect(toExpense.status).toBeGreaterThanOrEqual(200);
    const teA1 = await accountAPI.getAccount(a1.data!.id as number);
    const teA2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(teA1.data!.amount).toBe(-100);
    expect(teA2.data!.amount).toBe(0);

    const updCat = await categoryAPI.updateCategory(catE.data!.id as number, {
      type: "income",
    });
    expect(updCat.status).toBeGreaterThanOrEqual(200);
    const toIncome = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "income" } as any
    );
    expect(toIncome.status).toBeGreaterThanOrEqual(200);
    const tiA1 = await accountAPI.getAccount(a1.data!.id as number);
    expect(tiA1.data!.amount).toBe(100);

    const fixCat = await categoryAPI.updateCategory(catE.data!.id as number, {
      type: "expense",
    });
    expect(fixCat.status).toBeGreaterThanOrEqual(200);
    const incToExp = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "expense" } as any
    );
    expect(incToExp.status).toBeGreaterThanOrEqual(200);
    const ieA1 = await accountAPI.getAccount(a1.data!.id as number);
    expect(ieA1.data!.amount).toBe(-100);

    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
  });

  test("account and category type swaps affect only new transactions", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `s3-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `s3-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 75,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx.status).toBeGreaterThanOrEqual(200);

    const aUpd = await accountAPI.updateAccount(acc.data!.id as number, {
      type: "income",
    });
    expect(aUpd.status).toBeGreaterThanOrEqual(200);
    const after = await accountAPI.getAccount(acc.data!.id as number);
    expect(after.data!.amount).toBe(-75);

    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 25,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx2.status).toBeGreaterThanOrEqual(200);

    const cUpd = await categoryAPI.updateCategory(cat.data!.id as number, {
      type: "income",
    });
    expect(cUpd.status).toBeGreaterThanOrEqual(200);

    const tx3 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 10,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    } as any);
    expect(tx3.status).toBeGreaterThanOrEqual(400);

    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("large and floating amounts", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `s5-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `s5-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const big = 9_000_000_000_000; // 9 trillion
    const rBig = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: big,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(rBig.status).toBeGreaterThanOrEqual(200);
    const afterBig = await accountAPI.getAccount(acc.data!.id as number);
    expect(afterBig.data!.amount).toBe(-big);

    const rFloat = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 123.45,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    } as any);
    expect(rFloat.status).toBeGreaterThanOrEqual(400);

    await transactionAPI.deleteTransaction(rBig.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

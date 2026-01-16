import { test, expect } from "@fixtures/index";

test.describe("Transactions - Transaction Type Swaps", () => {
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
    expect(tx.status).toBe(200);

    const toTransfer = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "transfer", destinationAccountId: a2.data!.id as number } as any
    );
    expect(toTransfer.status).toBe(200);
    const tA1 = await accountAPI.getAccount(a1.data!.id as number);
    const tA2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(tA1.data!.amount).toBe(-100);
    expect(tA2.data!.amount).toBe(100);

    const toExpense = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "expense", accountId: a1.data!.id as number } as any
    );
    expect(toExpense.status).toBe(200);
    const teA1 = await accountAPI.getAccount(a1.data!.id as number);
    const teA2 = await accountAPI.getAccount(a2.data!.id as number);
    expect(teA1.data!.amount).toBe(-100);
    expect(teA2.data!.amount).toBe(0);

    const updCat = await categoryAPI.updateCategory(catE.data!.id as number, {
      type: "income",
    });
    expect(updCat.status).toBe(200);
    const toIncome = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "income" } as any
    );
    expect(toIncome.status).toBe(200);
    const tiA1 = await accountAPI.getAccount(a1.data!.id as number);
    expect(tiA1.data!.amount).toBe(100);

    const fixCat = await categoryAPI.updateCategory(catE.data!.id as number, {
      type: "expense",
    });
    expect(fixCat.status).toBe(200);
    const incToExp = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      { type: "expense" } as any
    );
    expect(incToExp.status).toBe(200);
    const ieA1 = await accountAPI.getAccount(a1.data!.id as number);
    expect(ieA1.data!.amount).toBe(-100);

    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
  });
});

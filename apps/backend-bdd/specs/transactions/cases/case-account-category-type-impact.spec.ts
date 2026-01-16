import { test, expect } from "@fixtures/index";

test.describe("Transactions - Account & Category Type Impact", () => {
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
    expect(tx.status).toBe(200);

    const aUpd = await accountAPI.updateAccount(acc.data!.id as number, {
      type: "income",
    });
    expect(aUpd.status).toBe(200);
    const after = await accountAPI.getAccount(acc.data!.id as number);
    expect(after.data!.amount).toBe(-75);

    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 25,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx2.status).toBe(200);

    const cUpd = await categoryAPI.updateCategory(cat.data!.id as number, {
      type: "income",
    });
    expect(cUpd.status).toBe(200);

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
});

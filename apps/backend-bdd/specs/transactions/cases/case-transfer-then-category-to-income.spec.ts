import { test, expect } from "@fixtures/index";

test.describe("Transactions - Transfer then Category->Income", () => {
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
});

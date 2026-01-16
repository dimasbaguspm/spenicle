import { test, expect } from "@fixtures/index";

test.describe("Transactions - Amount Edgecases", () => {
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

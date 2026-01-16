import { test, expect } from "@fixtures/index";

test.describe("Transactions - Transfer Cases", () => {
  test("create transfer updates both account balances", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `t-acc1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `t-acc2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    // transfer category type can be expense (category is required but for transfers category validation may be skipped); create any category
    const cat = await categoryAPI.createCategory({
      name: `t-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const payload = {
      accountId: a1.data!.id as number,
      destinationAccountId: a2.data!.id as number,
      amount: 1500,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "transfer" as const,
    };

    const res = await transactionAPI.createTransaction(payload);
    expect(res.status).toBe(200);
    const tx = res.data!;

    // fetch accounts and check balances changed accordingly
    const a1After = await accountAPI.getAccount(a1.data!.id as number);
    const a2After = await accountAPI.getAccount(a2.data!.id as number);
    expect(a1After.data!.amount).toBeLessThan(0);
    expect(a2After.data!.amount).toBeGreaterThan(0);

    // cleanup
    await transactionAPI.deleteTransaction(tx.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

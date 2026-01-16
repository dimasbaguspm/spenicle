import { test, expect } from "@fixtures/index";

test.describe("Transactions - Concurrency", () => {
  test("concurrent creates produce unique ids and consistent balances", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `cc-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `cc-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const promises: Promise<any>[] = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        transactionAPI.createTransaction({
          accountId: acc.data!.id as number,
          amount: 100 + i,
          categoryId: cat.data!.id as number,
          date: new Date().toISOString(),
          type: "expense" as const,
        })
      );
    }

    const results = await Promise.all(promises);
    const ids = results.map((r: any) => r.data!.id as number);
    expect(new Set(ids).size).toBe(ids.length);

    const after = await accountAPI.getAccount(acc.data!.id as number);
    // sum of amounts should equal account balance negative
    const sum = ids.reduce((s, _, idx) => s + (100 + idx), 0);
    expect(after.data!.amount).toBe(-sum);

    // cleanup transactions
    for (const id of ids) await transactionAPI.deleteTransaction(id);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

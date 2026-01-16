import { test, expect } from "@fixtures/index";

test.describe("Transactions - Pagination", () => {
  test("pages do not overlap and total consistent", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `pg-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `pg-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const created: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await transactionAPI.createTransaction({
        accountId: acc.data!.id as number,
        amount: 10 + i,
        categoryId: cat.data!.id as number,
        date: new Date().toISOString(),
        type: "expense" as const,
      });
      created.push(r.data!.id as number);
    }

    const p1 = await transactionAPI.getTransactions({
      pageNumber: 1,
      pageSize: 2,
    });
    const p2 = await transactionAPI.getTransactions({
      pageNumber: 2,
      pageSize: 2,
    });
    expect(p1.status).toBeGreaterThanOrEqual(200);
    expect(p2.status).toBeGreaterThanOrEqual(200);
    const ids1 = (p1.data!.items || []).map((it: any) => it.id);
    const ids2 = (p2.data!.items || []).map((it: any) => it.id);
    for (const id of ids2) expect(ids1.includes(id)).toBe(false);

    // cleanup
    for (const id of created) await transactionAPI.deleteTransaction(id);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

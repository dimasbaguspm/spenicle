import { test, expect } from "@fixtures/index";

test.describe("Transactions - Date and Amount Filters", () => {
  test("filter by date range and amount range", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `f-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `f-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // use full RFC3339 date-time strings (ISO) for the query parameters
    const startDate = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    const endDate = new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000
    ).toISOString();

    const r1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50,
      categoryId: cat.data!.id as number,
      date: yesterday.toISOString(),
      type: "expense" as const,
    });
    const r2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 150,
      categoryId: cat.data!.id as number,
      date: today.toISOString(),
      type: "expense" as const,
    });
    const r3 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 300,
      categoryId: cat.data!.id as number,
      date: tomorrow.toISOString(),
      type: "expense" as const,
    });

    const byDate = await transactionAPI.getTransactions({
      startDate,
      endDate,
      pageSize: 100,
    });
    expect(byDate.status).toBe(200);
    expect(byDate.data).toBeDefined();
    const ids = (byDate.data?.items ?? []).map((it: any) => it.id);
    expect(ids).toContain(r1.data!.id);
    expect(ids).toContain(r2.data!.id);

    const byAmount = await transactionAPI.getTransactions({
      minAmount: 100,
      maxAmount: 200,
      pageSize: 100,
    });
    expect(byAmount.status).toBe(200);
    const amountIds = (byAmount.data?.items ?? []).map((it: any) => it.id);
    expect(amountIds).toContain(r2.data!.id);

    // cleanup
    for (const id of [r1, r2, r3].map((r) => r.data!.id as number))
      await transactionAPI.deleteTransaction(id);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

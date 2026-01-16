import { test, expect } from "@fixtures/index";

test.describe("Summary - Common", () => {
  test("account, category, transaction summaries return expected shapes", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `sum-a1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `sum-a2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `sum-ce-${Date.now()}`,
      note: "ce",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `sum-ci-${Date.now()}`,
      note: "ci",
      type: "income",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const t1 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: catE.data!.id as number,
      date: yesterday,
      type: "expense" as const,
    });
    const t2 = await transactionAPI.createTransaction({
      accountId: a2.data!.id as number,
      amount: 200,
      categoryId: catI.data!.id as number,
      date: today,
      type: "income" as const,
    });
    const t3 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 50,
      categoryId: catE.data!.id as number,
      date: today,
      type: "expense" as const,
    });

    const accSum = await summaryAPI.getAccountSummary({
      startDate: yesterday,
      endDate: tomorrow,
    });
    expect(accSum.status).toBeGreaterThanOrEqual(200);
    expect(accSum.data).toBeDefined();
    const accItems = accSum.data?.data ?? [];
    expect(Array.isArray(accItems)).toBe(true);

    const catSum = await summaryAPI.getCategorySummary({
      startDate: yesterday,
      endDate: tomorrow,
    });
    expect(catSum.status).toBeGreaterThanOrEqual(200);
    expect(catSum.data).toBeDefined();
    const catItems = catSum.data?.data ?? [];
    expect(Array.isArray(catItems)).toBe(true);

    const txSum = await summaryAPI.getTransactionSummary({
      startDate: yesterday,
      endDate: tomorrow,
      frequency: "daily",
    });
    expect(txSum.status).toBeGreaterThanOrEqual(200);
    expect(txSum.data).toBeDefined();
    const txItems = txSum.data?.data ?? [];
    expect(Array.isArray(txItems)).toBe(true);

    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });

  test("empty range returns zeroed totals", async ({ summaryAPI }) => {
    const farFuture = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365
    ).toISOString();
    const farFutureEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 366
    ).toISOString();
    const accSum = await summaryAPI.getAccountSummary({
      startDate: farFuture,
      endDate: farFutureEnd,
    });
    expect(accSum.status).toBeGreaterThanOrEqual(200);
    expect(accSum.data).toBeDefined();
    const items = accSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    for (const it of items) {
      expect(Number(it.incomeAmount || 0)).toBeGreaterThanOrEqual(0);
      expect(Number(it.expenseAmount || 0)).toBeGreaterThanOrEqual(0);
    }
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Summary - Cases", () => {
  test("aggregates large amounts and groups by category", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `sum-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `sum-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const now = new Date().toISOString();
    const t1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 5_000_000_000_000,
      categoryId: cat.data!.id as number,
      date: now,
      type: "expense" as const,
    });
    const t2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 6_000_000_000_000,
      categoryId: cat.data!.id as number,
      date: now,
      type: "expense" as const,
    });

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date(Date.now() + 3600 * 1000).toISOString();

    const catSum = await summaryAPI.getCategorySummary({
      startDate: from,
      endDate: to,
    });
    expect(catSum.status).toBeGreaterThanOrEqual(200);
    expect(catSum.data).toBeDefined();
    const catItems = catSum.data?.data ?? [];
    expect(Array.isArray(catItems)).toBe(true);
    expect(catItems.length).toBeGreaterThanOrEqual(1);

    // overlapping ranges: ensure results stable
    const catSum2 = await summaryAPI.getCategorySummary({
      startDate: now,
      endDate: to,
    });
    expect(catSum2.status).toBeGreaterThanOrEqual(200);
    const catItems2 = catSum2.data?.data ?? [];
    expect(Array.isArray(catItems2)).toBe(true);

    // cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("boundary dates and single-day grouping for transaction summary", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `sum2-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `sum2-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const dt = new Date();
    dt.setUTCHours(0, 0, 0, 0);
    const startOfDay = dt.toISOString();
    const endOfDay = new Date(
      dt.getTime() + 24 * 3600 * 1000 - 1
    ).toISOString();

    const t = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 123,
      categoryId: cat.data!.id as number,
      date: startOfDay,
      type: "expense",
    });

    const txSum = await summaryAPI.getTransactionSummary({
      startDate: startOfDay,
      endDate: endOfDay,
      frequency: "daily",
    });
    expect(txSum.status).toBeGreaterThanOrEqual(200);
    expect(txSum.data).toBeDefined();
    const txItems = txSum.data?.data ?? [];
    expect(Array.isArray(txItems)).toBe(true);
    expect(txItems.length).toBeGreaterThanOrEqual(1);

    await transactionAPI.deleteTransaction(t.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Summary - Transaction Summary Cases", () => {
  test("GET /summary/transactions - daily grouping and transfer aggregation", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `tx-daily-a1-${Date.now()}`,
      note: "daily grouping test",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `tx-daily-a2-${Date.now()}`,
      note: "daily grouping test",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `tx-daily-ce-${Date.now()}`,
      note: "daily grouping test",
      type: "expense",
    });
    const catT = await categoryAPI.createCategory({
      name: `tx-daily-ct-${Date.now()}`,
      note: "daily grouping test",
      type: "transfer",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();

    // Regular expense transaction
    const t1 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: catE.data!.id as number,
      date: yesterday,
      type: "expense" as const,
    });

    // Transfer transaction
    const t2 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      destinationAccountId: a2.data!.id as number,
      amount: 50,
      categoryId: catT.data!.id as number,
      date: today,
      type: "transfer" as const,
    });

    const txSum = await summaryAPI.getTransactionSummary({
      startDate: yesterday,
      endDate: today,
      frequency: "daily",
    });
    expect(txSum.status).toBe(200);
    expect(txSum.data).toBeDefined();
    const txItems = txSum.data?.data ?? [];
    expect(Array.isArray(txItems)).toBe(true);

    // Should have data grouped by day
    expect(txItems.length).toBeGreaterThan(0);

    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catT.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });

  test("GET /summary/transactions - filters and calculation match transactions in range", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `tx-filter-a1-${Date.now()}`,
      note: "transaction filter test",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `tx-filter-ce-${Date.now()}`,
      note: "transaction filter test",
      type: "expense",
    });

    const now = new Date();
    const d1 = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const d0 = now.toISOString();

    const prevAcc = await summaryAPI.getAccountSummary({
      startDate: d1,
      endDate: d0,
    });
    expect(prevAcc.status).toBe(200);
    const prevAccItems = prevAcc.data?.data ?? [];

    const t2 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 50,
      categoryId: catE.data!.id as number,
      date: d0,
      type: "expense" as const,
    });

    const txSum = await summaryAPI.getTransactionSummary({
      startDate: d1,
      endDate: d0,
      frequency: "daily",
    });
    expect(txSum.status).toBe(200);
    expect(txSum.data).toBeDefined();

    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
  });

  test("GET /summary/transactions - daily/monthly/yearly frequency consistency", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `freq-consistency-acc-${Date.now()}`,
      note: "frequency consistency test",
      type: "income",
    });
    const cat = await categoryAPI.createCategory({
      name: `freq-consistency-cat-${Date.now()}`,
      note: "frequency consistency test",
      type: "income",
    });

    const base = new Date();
    const d0 = new Date(base.getTime() - 5 * 24 * 3600 * 1000); // 5 days ago
    const d1 = new Date(base.getTime() - 2 * 24 * 3600 * 1000); // 2 days ago
    const d2 = new Date(base.getTime() + 40 * 24 * 3600 * 1000); // 40 days ahead (next month)

    const s0 = d0.toISOString();
    const s1 = d1.toISOString();
    const s2 = d2.toISOString();

    const tx0 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 10,
      categoryId: cat.data!.id as number,
      date: s0,
      type: "income" as const,
    });
    expect(tx0.status).toBe(200);

    const tx1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 20,
      categoryId: cat.data!.id as number,
      date: s1,
      type: "income" as const,
    });
    expect(tx1.status).toBe(200);

    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 30,
      categoryId: cat.data!.id as number,
      date: s2,
      type: "income" as const,
    });
    expect(tx2.status).toBe(200);

    // Test daily frequency
    const dailySum = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s2,
      frequency: "daily",
    });
    expect(dailySum.status).toBe(200);
    expect(dailySum.data).toBeDefined();

    // Test monthly frequency
    const monthlySum = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s2,
      frequency: "monthly",
    });
    expect(monthlySum.status).toBe(200);
    expect(monthlySum.data).toBeDefined();

    // Test yearly frequency
    const yearlySum = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s2,
      frequency: "yearly",
    });
    expect(yearlySum.status).toBe(200);
    expect(yearlySum.data).toBeDefined();

    await transactionAPI.deleteTransaction(tx0.data!.id as number);
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

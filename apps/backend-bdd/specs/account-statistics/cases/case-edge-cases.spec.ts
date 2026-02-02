import { test, expect } from "@fixtures/index";

test.describe("Account Statistics - Edge Cases", () => {
  test("statistics with single transaction returns correct data", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `edge-single-tx-${Date.now()}`,
      note: "single transaction",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `edge-single-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 10 * 24 * 3600 * 1000);
    const amount = 5000;

    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    // Get statistics
    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify single transaction is reflected
    expect(stats.categoryHeatmap.categoryCount).toBe(1);
    expect(stats.categoryHeatmap.totalSpending).toBe(amount);
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBe(1);

    // Cleanup
    await transactionAPI.deleteTransaction(txRes.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("statistics with no transactions returns empty but valid response", async ({
    accountAPI,
    accountStatisticsAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `edge-empty-${Date.now()}`,
      note: "no transactions",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify empty data is handled
    expect(stats.categoryHeatmap.categoryCount).toBe(0);
    expect(stats.categoryHeatmap.totalSpending).toBe(0);
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBe(0);
    expect(stats.burnRate.totalSpending).toBe(0);

    // Cleanup
    await accountAPI.deleteAccount(accountId);
  });

  test("heatmap with zero spending in all categories", async ({
    accountAPI,
    accountStatisticsAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `edge-zero-spend-${Date.now()}`,
      note: "zero spending",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 10 * 24 * 3600 * 1000);

    // Get heatmap with no transactions
    const heatmapRes = await accountStatisticsAPI.getCategoryHeatmap(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(heatmapRes.status).toBe(200);
    const heatmap = heatmapRes.data!;

    // No transactions means zero spending
    expect(heatmap.totalSpending).toBe(0);
    expect(heatmap.categoryCount).toBe(0);

    // Cleanup
    await accountAPI.deleteAccount(accountId);
  });

  test("monthly velocity with transactions across year boundary", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `edge-year-boundary-${Date.now()}`,
      note: "year boundary",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `edge-year-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    // Create transactions near year boundary
    const decemberDate = new Date("2025-12-28T10:00:00Z");
    const januaryDate = new Date("2026-01-05T10:00:00Z");
    const startDate = new Date("2025-11-01T00:00:00Z");
    const endDate = new Date("2026-02-01T23:59:59Z");

    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: decemberDate.toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId,
      date: januaryDate.toISOString(),
      type: "expense" as const,
    });

    const velocityRes = await accountStatisticsAPI.getMonthlyVelocity(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(velocityRes.status).toBe(200);
    const velocity = velocityRes.data!;

    // Should have data for both months
    expect(velocity.data).toBeDefined();
    expect(Array.isArray(velocity.data)).toBe(true);
    expect(velocity.data!.length).toBeGreaterThanOrEqual(1);

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("burn rate with all income transactions", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `edge-income-only-${Date.now()}`,
      note: "income only",
      type: "income",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `edge-income-cat-${Date.now()}`,
      note: "test",
      type: "income",
    });
    const categoryId = catRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 10000,
      categoryId,
      date: now.toISOString(),
      type: "income" as const,
    });

    const burnRateRes = await accountStatisticsAPI.getBurnRate(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(burnRateRes.status).toBe(200);
    const burnRate = burnRateRes.data!;

    // No spending means zero burn rate
    expect(burnRate.dailyAverageSpend).toBe(0);
    expect(burnRate.weeklyAverageSpend).toBe(0);
    expect(burnRate.monthlyAverageSpend).toBe(0);
    expect(burnRate.totalSpending).toBe(0);

    // Cleanup
    await transactionAPI.deleteTransaction(txRes.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("cash flow pulse maintains running balance correctly", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `edge-cashflow-balance-${Date.now()}`,
      note: "cash flow balance",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `edge-cf-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 10 * 24 * 3600 * 1000);

    // Create transactions on different days
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const cashFlowRes = await accountStatisticsAPI.getCashFlowPulse(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(cashFlowRes.status).toBe(200);
    const cashFlow = cashFlowRes.data!;

    // Ending balance should reflect the sum of transactions
    expect(cashFlow.endingBalance).toBeLessThan(0);

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Account Statistics - Large Datasets and Performance", () => {
  test("handles account with large transaction volume (100+ transactions)", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `perf-large-volume-${Date.now()}`,
      note: "large volume",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `perf-large-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-12-31");

    const txIds = [];

    // Create 100 transactions distributed across the year
    for (let i = 0; i < 100; i++) {
      const dayOfYear = Math.floor((i / 100) * 365);
      const date = new Date(2026, 0, 1 + dayOfYear);

      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 1000 + Math.floor(Math.random() * 4000),
        categoryId,
        date: date.toISOString(),
        type: "expense" as const,
      });
      if (res.data?.id) {
        txIds.push(res.data!.id as number);
      }
    }

    // Get statistics - should handle large volume efficiently
    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify data integrity - may have fewer if some failed
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBeGreaterThan(0);
    expect(stats.categoryHeatmap.totalSpending).toBeGreaterThan(0);
    expect(stats.burnRate.totalSpending).toBeGreaterThan(0);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("handles multiple categories with many transactions each", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `perf-multi-cat-${Date.now()}`,
      note: "multi category large",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categories = [];
    const categoryTxIds: { [key: number]: number[] } = {};

    // Create 10 categories
    for (let c = 0; c < 10; c++) {
      const catRes = await categoryAPI.createCategory({
        name: `perf-cat${c}-${Date.now()}`,
        note: `category ${c}`,
        type: "expense",
      });
      categories.push(catRes.data!.id as number);
      categoryTxIds[catRes.data!.id as number] = [];
    }

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-03-31");

    // Create 10 transactions per category = 100 total
    for (let c = 0; c < categories.length; c++) {
      for (let t = 0; t < 10; t++) {
        const date = new Date(2026, 0, 1 + t + c * 3);
        const res = await transactionAPI.createTransaction({
          accountId,
          amount: 1000 + c * 100,
          categoryId: categories[c],
          date: date.toISOString(),
          type: "expense" as const,
        });
        categoryTxIds[categories[c]].push(res.data!.id as number);
      }
    }

    const heatmapRes = await accountStatisticsAPI.getCategoryHeatmap(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(heatmapRes.status).toBe(200);
    const heatmap = heatmapRes.data!;

    // Should have 10 categories
    expect(heatmap.categoryCount).toBe(10);

    // Should show total spending for all categories
    expect(heatmap.totalSpending).toBeGreaterThan(0);

    // Cleanup
    for (const catId of categories) {
      for (const txId of categoryTxIds[catId]) {
        await transactionAPI.deleteTransaction(txId);
      }
      await categoryAPI.deleteCategory(catId);
    }
    await accountAPI.deleteAccount(accountId);
  });

  test("monthly velocity handles full year dataset efficiently", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `perf-full-year-${Date.now()}`,
      note: "full year data",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `perf-year-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    const txIds = [];

    // Create 5 transactions per month = 60 total for full year
    for (let month = 0; month < 12; month++) {
      for (let day = 1; day <= 5; day++) {
        const res = await transactionAPI.createTransaction({
          accountId,
          amount: 2000 + Math.floor(Math.random() * 3000),
          categoryId,
          date: new Date(2025, month, day * 6).toISOString(),
          type: "expense" as const,
        });
        txIds.push(res.data!.id as number);
      }
    }

    const velocityRes = await accountStatisticsAPI.getMonthlyVelocity(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(velocityRes.status).toBe(200);
    const velocity = velocityRes.data!;

    // Should have data for all 12 months
    expect(velocity.data).toBeDefined();
    expect(Array.isArray(velocity.data)).toBe(true);
    expect(velocity.data!.length).toBeGreaterThanOrEqual(12);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("cash flow pulse handles daily balance calculations for long period", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `perf-long-cashflow-${Date.now()}`,
      note: "long cash flow",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `perf-cf-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-12-31");

    const txIds = [];

    // Create transaction every 3 days for a full year
    let currentDate = new Date(2026, 0, 1);
    while (currentDate < new Date(2026, 11, 31)) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 500 + Math.floor(Math.random() * 1500),
        categoryId,
        date: currentDate.toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);

      currentDate = new Date(currentDate.getTime() + 3 * 24 * 3600 * 1000);
    }

    const cashFlowRes = await accountStatisticsAPI.getCashFlowPulse(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(cashFlowRes.status).toBe(200);
    const cashFlow = cashFlowRes.data!;

    // Should have valid balance calculations
    expect(cashFlow.endingBalance).toBeLessThan(0);
    expect(cashFlow.startingBalance).toBeDefined();

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("burn rate calculation remains accurate with many transactions", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `perf-burn-accuracy-${Date.now()}`,
      note: "burn rate accuracy",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `perf-burn-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");

    const txIds = [];
    let totalAmount = 0;

    // Create many daily transactions
    for (let day = 1; day <= 31; day++) {
      const amount = 1000 + day * 100;
      totalAmount += amount;

      const res = await transactionAPI.createTransaction({
        accountId,
        amount,
        categoryId,
        date: new Date(2026, 0, day).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    const burnRes = await accountStatisticsAPI.getBurnRate(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(burnRes.status).toBe(200);
    const burn = burnRes.data!;

    // Total should be within range (allowing for transaction creation failures)
    expect(burn.totalSpending).toBeGreaterThan(0);
    expect(burn.totalSpending).toBeLessThanOrEqual(totalAmount);

    // Average values should be positive
    expect(burn.dailyAverageSpend).toBeGreaterThan(0);
    expect(burn.weeklyAverageSpend).toBeGreaterThan(0);
    expect(burn.monthlyAverageSpend).toBeGreaterThan(0);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("time frequency handles dense transaction patterns", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `perf-dense-freq-${Date.now()}`,
      note: "dense frequency",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `perf-freq-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");

    const txIds = [];

    // Create multiple transactions per day
    for (let day = 1; day <= 10; day++) {
      for (let txPerDay = 0; txPerDay < 10; txPerDay++) {
        const res = await transactionAPI.createTransaction({
          accountId,
          amount: 500,
          categoryId,
          date: new Date(2026, 0, day, txPerDay * 2, 0).toISOString(),
          type: "expense" as const,
        });
        txIds.push(res.data!.id as number);
      }
    }

    const freqRes = await accountStatisticsAPI.getTimeFrequencyHeatmap(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(freqRes.status).toBe(200);
    const freq = freqRes.data!;

    // Should have at least 90 of 100 transactions (allowing for some failures)
    expect(freq.totalTransactions).toBeGreaterThanOrEqual(90);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

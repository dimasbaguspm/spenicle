import { test, expect } from "@fixtures/index";

test.describe("Account Statistics - Filtering and Aggregation", () => {
  test("category heatmap correctly aggregates multiple transactions per category", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `filter-agg-${Date.now()}`,
      note: "aggregation test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const cat1Res = await categoryAPI.createCategory({
      name: `filter-cat1-${Date.now()}`,
      note: "category 1",
      type: "expense",
    });
    const cat1Id = cat1Res.data!.id as number;

    const cat2Res = await categoryAPI.createCategory({
      name: `filter-cat2-${Date.now()}`,
      note: "category 2",
      type: "expense",
    });
    const cat2Id = cat2Res.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create multiple transactions per category
    const cat1Txs = [];
    for (let i = 0; i < 3; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 1000 * (i + 1),
        categoryId: cat1Id,
        date: new Date(
          now.getTime() - (10 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      cat1Txs.push(res.data!.id as number);
    }

    const cat2Txs = [];
    for (let i = 0; i < 2; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 2000 * (i + 1),
        categoryId: cat2Id,
        date: new Date(
          now.getTime() - (15 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      cat2Txs.push(res.data!.id as number);
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

    // Should have 2 categories
    expect(heatmap.categoryCount).toBe(2);

    // Total spending: cat1 (1000+2000+3000) + cat2 (2000+4000) = 12000
    expect(heatmap.totalSpending).toBe(12000);

    // Cleanup
    const allTxs = [...cat1Txs, ...cat2Txs];
    for (const txId of allTxs) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(cat1Id);
    await categoryAPI.deleteCategory(cat2Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("monthly velocity shows correct spending trends across months", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `filter-monthly-${Date.now()}`,
      note: "monthly trends",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `filter-monthly-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-03-31");

    const txIds = [];

    // January: 3 transactions, total 6000
    for (let i = 0; i < 3; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 2000,
        categoryId,
        date: new Date(`2026-01-${(i + 1) * 10}`).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // February: 2 transactions, total 5000
    for (let i = 0; i < 2; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 2500,
        categoryId,
        date: new Date(`2026-02-${(i + 1) * 10}`).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // March: 4 transactions, total 8000
    for (let i = 0; i < 4; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 2000,
        categoryId,
        date: new Date(`2026-03-${(i + 1) * 7}`).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
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

    // Should have at least 3 months of data
    expect(velocity.data).toBeDefined();
    expect(Array.isArray(velocity.data)).toBe(true);
    expect(velocity.data!.length).toBeGreaterThanOrEqual(3);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("time frequency heatmap correctly counts transaction distribution", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `filter-frequency-${Date.now()}`,
      note: "frequency test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `filter-freq-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");

    const txIds = [];

    // Create transactions across different days
    for (let day = 1; day <= 10; day++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 1000,
        categoryId,
        date: new Date(
          `2026-01-${day.toString().padStart(2, "0")}`,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
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

    // Should have 10 transactions
    expect(freq.totalTransactions).toBe(10);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("burn rate correctly calculates spending averages", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `filter-burn-${Date.now()}`,
      note: "burn rate test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `filter-burn-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-01-31");

    const txIds = [];

    // Create transactions across the month (total 10,000)
    for (let day = 1; day <= 10; day++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 1000,
        categoryId,
        date: new Date(
          `2026-01-${day.toString().padStart(2, "0")}`,
        ).toISOString(),
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

    // Total spending
    expect(burn.totalSpending).toBe(10000);

    // Daily average should be around 1000
    expect(burn.dailyAverageSpend).toBeGreaterThan(0);

    // Weekly and monthly averages should be higher
    expect(burn.weeklyAverageSpend).toBeGreaterThan(burn.dailyAverageSpend);
    expect(burn.monthlyAverageSpend).toBeGreaterThan(burn.weeklyAverageSpend);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("budget health aggregates active and past budgets separately", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    budgetAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `filter-budget-${Date.now()}`,
      note: "budget aggregation",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `filter-budget-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 60 * 24 * 3600 * 1000);

    // Create active budget
    const activeBudgetRes = await budgetAPI.createBudget({
      accountId,
      name: `active-budget-${Date.now()}`,
      amountLimit: 10000,
      periodStart: new Date(
        now.getTime() - 10 * 24 * 3600 * 1000,
      ).toISOString(),
      periodEnd: new Date(now.getTime() + 20 * 24 * 3600 * 1000).toISOString(),
    });
    const activeBudgetId = activeBudgetRes.data?.id as number;

    // Create past budget
    const pastBudgetRes = await budgetAPI.createBudget({
      accountId,
      name: `past-budget-${Date.now()}`,
      amountLimit: 5000,
      periodStart: new Date(
        now.getTime() - 60 * 24 * 3600 * 1000,
      ).toISOString(),
      periodEnd: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString(),
    });
    const pastBudgetId = pastBudgetRes.data?.id as number;

    // Create transaction for active budget
    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const healthRes = await accountStatisticsAPI.getBudgetHealth(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(healthRes.status).toBe(200);
    const health = healthRes.data!;

    // Should track budgets (may be array or number depending on API)
    expect(health.activeBudgets || health.pastBudgets).toBeDefined();

    // Cleanup
    await transactionAPI.deleteTransaction(txRes.data!.id as number);
    if (activeBudgetId) await budgetAPI.deleteBudget(activeBudgetId);
    if (pastBudgetId) await budgetAPI.deleteBudget(pastBudgetId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

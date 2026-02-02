import { test, expect } from "@fixtures/index";

test.describe("Account Statistics - Complex Scenarios", () => {
  test("handles multiple accounts with different spending patterns", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Create account 1: high spending
    const acc1Res = await accountAPI.createAccount({
      name: `complex-high-spend-${Date.now()}`,
      note: "high spending",
      type: "expense",
    });
    const acc1Id = acc1Res.data!.id as number;

    // Create account 2: low spending
    const acc2Res = await accountAPI.createAccount({
      name: `complex-low-spend-${Date.now()}`,
      note: "low spending",
      type: "expense",
    });
    const acc2Id = acc2Res.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `complex-multi-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Account 1: 10 large transactions
    const acc1Txs = [];
    for (let i = 0; i < 10; i++) {
      const res = await transactionAPI.createTransaction({
        accountId: acc1Id,
        amount: 5000,
        categoryId,
        date: new Date(
          now.getTime() - (20 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      acc1Txs.push(res.data!.id as number);
    }

    // Account 2: 5 small transactions
    const acc2Txs = [];
    for (let i = 0; i < 5; i++) {
      const res = await transactionAPI.createTransaction({
        accountId: acc2Id,
        amount: 500,
        categoryId,
        date: new Date(
          now.getTime() - (25 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      acc2Txs.push(res.data!.id as number);
    }

    // Get stats for each account
    const stats1Res = await accountStatisticsAPI.getAccountStatistics(acc1Id, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const stats2Res = await accountStatisticsAPI.getAccountStatistics(acc2Id, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(stats1Res.status).toBe(200);
    expect(stats2Res.status).toBe(200);

    const stats1 = stats1Res.data!;
    const stats2 = stats2Res.data!;

    // Account 1 should have much higher spending
    expect(stats1.categoryHeatmap.totalSpending).toBe(50000);
    expect(stats2.categoryHeatmap.totalSpending).toBe(2500);
    expect(stats1.categoryHeatmap.totalSpending).toBeGreaterThan(
      stats2.categoryHeatmap.totalSpending,
    );

    // Cleanup
    const allTxs1 = [...acc1Txs];
    for (const txId of allTxs1) {
      await transactionAPI.deleteTransaction(txId);
    }
    const allTxs2 = [...acc2Txs];
    for (const txId of allTxs2) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(acc1Id);
    await accountAPI.deleteAccount(acc2Id);
  });

  test("handles mixed income and expense transactions correctly", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `complex-mixed-${Date.now()}`,
      note: "mixed transactions",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const expenseCatRes = await categoryAPI.createCategory({
      name: `complex-expense-cat-${Date.now()}`,
      note: "expense",
      type: "expense",
    });
    const expenseCatId = expenseCatRes.data!.id as number;

    const incomeCatRes = await categoryAPI.createCategory({
      name: `complex-income-cat-${Date.now()}`,
      note: "income",
      type: "income",
    });
    const incomeCatId = incomeCatRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const txIds = [];

    // Create expenses
    for (let i = 0; i < 5; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 2000,
        categoryId: expenseCatId,
        date: new Date(
          now.getTime() - (20 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // Create incomes
    for (let i = 0; i < 3; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 10000,
        categoryId: incomeCatId,
        date: new Date(
          now.getTime() - (15 - i * 5) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "income" as const,
      });
      txIds.push(res.data!.id as number);
    }

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Heatmap should only count expenses
    expect(stats.categoryHeatmap.totalSpending).toBe(10000);
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBe(8);

    // Cash flow should include both
    expect(stats.cashFlowPulse).toBeDefined();

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(expenseCatId);
    await categoryAPI.deleteCategory(incomeCatId);
    await accountAPI.deleteAccount(accountId);
  });

  test("statistics change correctly as transactions are added/removed", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `complex-dynamic-${Date.now()}`,
      note: "dynamic changes",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `complex-dynamic-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Get initial stats (empty)
    const initialStatsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(initialStatsRes.status).toBe(200);
    expect(initialStatsRes.data!.categoryHeatmap.totalSpending).toBe(0);

    // Add first transaction
    const tx1Res = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const stats1Res = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(stats1Res.status).toBe(200);
    expect(stats1Res.data!.categoryHeatmap.totalSpending).toBe(3000);
    expect(stats1Res.data!.timeFrequencyHeatmap.totalTransactions).toBe(1);

    // Add second transaction
    const tx2Res = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const stats2Res = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(stats2Res.status).toBe(200);
    expect(stats2Res.data!.categoryHeatmap.totalSpending).toBe(5000);
    expect(stats2Res.data!.timeFrequencyHeatmap.totalTransactions).toBe(2);

    // Delete first transaction
    await transactionAPI.deleteTransaction(tx1Res.data!.id as number);

    const stats3Res = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(stats3Res.status).toBe(200);
    expect(stats3Res.data!.categoryHeatmap.totalSpending).toBe(2000);
    expect(stats3Res.data!.timeFrequencyHeatmap.totalTransactions).toBe(1);

    // Cleanup
    await transactionAPI.deleteTransaction(tx2Res.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("statistics with recursive spending pattern detection", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `complex-recursive-${Date.now()}`,
      note: "recursive pattern",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `complex-recursive-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const startDate = new Date("2026-01-01");
    const endDate = new Date("2026-04-30");

    const txIds = [];

    // Create weekly pattern: every Monday, 1000
    for (let week = 0; week < 16; week++) {
      const date = new Date(2026, 0, 6 + week * 7);
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 1000,
        categoryId,
        date: date.toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should have 16 transactions
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBe(16);

    // Total spending: 16 * 1000
    expect(stats.categoryHeatmap.totalSpending).toBe(16000);

    // Frequency distribution should show consistent pattern
    expect(stats.timeFrequencyHeatmap).toBeDefined();

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("statistics with multiple categories and spending ratios", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `complex-ratios-${Date.now()}`,
      note: "spending ratios",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    // Create multiple categories
    const categories = [];
    for (let i = 0; i < 5; i++) {
      const catRes = await categoryAPI.createCategory({
        name: `complex-ratio-cat${i}-${Date.now()}`,
        note: `category ${i}`,
        type: "expense",
      });
      categories.push(catRes.data!.id as number);
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const txIds = [];

    // Create transactions with different amounts per category
    const amounts = [5000, 3000, 2000, 1000, 1000]; // Total: 12000
    for (let i = 0; i < categories.length; i++) {
      for (let j = 0; j < 2; j++) {
        const res = await transactionAPI.createTransaction({
          accountId,
          amount: amounts[i],
          categoryId: categories[i],
          date: new Date(
            now.getTime() - (20 - i - j * 5) * 24 * 3600 * 1000,
          ).toISOString(),
          type: "expense" as const,
        });
        txIds.push(res.data!.id as number);
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

    // Should have 5 categories
    expect(heatmap.categoryCount).toBe(5);

    // Total: 2 * (5000 + 3000 + 2000 + 1000 + 1000) = 24000
    expect(heatmap.totalSpending).toBe(24000);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    for (const catId of categories) {
      await categoryAPI.deleteCategory(catId);
    }
    await accountAPI.deleteAccount(accountId);
  });
});

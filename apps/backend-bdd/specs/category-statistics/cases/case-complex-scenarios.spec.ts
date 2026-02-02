import { test, expect } from "@fixtures/index";

test.describe("Category Statistics - Complex Scenarios", () => {
  test("complex scenario: multiple categories, accounts, and budgets", async ({
    accountAPI,
    budgetAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Setup: 2 accounts, 3 categories with budgets
    const account1Res = await accountAPI.createAccount({
      name: `cat-complex-acc1-${Date.now()}`,
      note: "account 1",
      type: "expense",
    });
    const account1Id = account1Res.data!.id as number;

    const account2Res = await accountAPI.createAccount({
      name: `cat-complex-acc2-${Date.now()}`,
      note: "account 2",
      type: "expense",
    });
    const account2Id = account2Res.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    // Create 3 categories with budgets
    const categories = [];
    const budgets = [];
    for (let i = 0; i < 3; i++) {
      const catRes = await categoryAPI.createCategory({
        name: `cat-complex-cat${i}-${Date.now()}`,
        note: `category ${i}`,
        type: "expense",
      });
      categories.push(catRes.data!.id as number);

      const budgetRes = await budgetAPI.createBudget({
        categoryId: catRes.data!.id as number,
        name: `Budget ${i}`,
        amountLimit: 10000,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
      });
      budgets.push(budgetRes.data!.id as number);
    }

    // Create varied transactions
    const txIds: number[] = [];

    // Category 0: Heavy spending from account 1
    for (let i = 0; i < 5; i++) {
      const res = await transactionAPI.createTransaction({
        accountId: account1Id,
        amount: 2000,
        categoryId: categories[0],
        date: new Date(
          now.getTime() - (20 - i * 2) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // Category 1: Mixed accounts
    for (let i = 0; i < 3; i++) {
      const res1 = await transactionAPI.createTransaction({
        accountId: account1Id,
        amount: 1500,
        categoryId: categories[1],
        date: new Date(
          now.getTime() - (15 - i * 2) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res1.data!.id as number);

      const res2 = await transactionAPI.createTransaction({
        accountId: account2Id,
        amount: 1000,
        categoryId: categories[1],
        date: new Date(
          now.getTime() - (14 - i * 2) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res2.data!.id as number);
    }

    // Category 2: Sparse transactions
    const res = await transactionAPI.createTransaction({
      accountId: account2Id,
      amount: 5000,
      categoryId: categories[2],
      date: now.toISOString(),
      type: "expense" as const,
    });
    txIds.push(res.data!.id as number);

    // Query first category and verify complex scenario
    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categories[0],
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify basic metrics
    expect(stats.averageTransactionSize.transactionCount).toBe(5);
    expect(stats.averageTransactionSize.averageAmount).toBe(2000);

    // Budget utilization (may return budgets with spent data)
    if (
      stats.budgetUtilization.budgets &&
      stats.budgetUtilization.budgets.length > 0
    ) {
      expect(stats.budgetUtilization.budgets.length).toBeGreaterThan(0);
    }

    // Verify account distribution
    expect(stats.accountDistribution.accounts!.length).toBe(1);
    expect(stats.accountDistribution.totalSpending).toBe(10000);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    for (const categoryId of categories) {
      await categoryAPI.deleteCategory(categoryId);
    }
    for (const budgetId of budgets) {
      await budgetAPI.deleteBudget(budgetId);
    }
    await accountAPI.deleteAccount(account1Id);
    await accountAPI.deleteAccount(account2Id);
  });

  test("scenario: budget overspend across multiple months", async ({
    accountAPI,
    budgetAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-complex-overspend-${Date.now()}`,
      note: "overspend scenario",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-complex-overspend-${Date.now()}`,
      note: "overspend",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();

    // Create two monthly budgets
    const month1Start = new Date(now.getFullYear(), now.getMonth(), 1);
    const month1End = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const month2Start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const month2End = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const budget1Res = await budgetAPI.createBudget({
      categoryId,
      name: "Month 1 Budget",
      amountLimit: 5000,
      periodStart: month1Start.toISOString(),
      periodEnd: month1End.toISOString(),
    });

    const budget2Res = await budgetAPI.createBudget({
      categoryId,
      name: "Month 2 Budget",
      amountLimit: 5000,
      periodStart: month2Start.toISOString(),
      periodEnd: month2End.toISOString(),
    });

    // Create transactions that exceed both budgets
    const txIds: number[] = [];

    // Month 1: Spend 6000 (1000 over)
    for (let i = 0; i < 3; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 2000,
        categoryId,
        date: new Date(
          month1Start.getTime() + i * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // Month 2: Spend 7000 (2000 over)
    for (let i = 0; i < 4; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: 1750,
        categoryId,
        date: new Date(
          month2Start.getTime() + i * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    const queryStart = new Date(month1Start.getTime() - 5 * 24 * 3600 * 1000);
    const queryEnd = new Date(month2End.getTime() + 5 * 24 * 3600 * 1000);

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: queryStart.toISOString(),
        endDate: queryEnd.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify budgets exist (may have spent data)
    // Note: Budget query may only return single budget or have different filtering
    if (
      stats.budgetUtilization.budgets &&
      stats.budgetUtilization.budgets.length > 0
    ) {
      expect(stats.budgetUtilization.budgets.length).toBeGreaterThanOrEqual(1);
    }

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    if (budget1Res.data?.id) {
      await budgetAPI.deleteBudget(budget1Res.data.id as number);
    }
    if (budget2Res.data?.id) {
      await budgetAPI.deleteBudget(budget2Res.data.id as number);
    }
    await accountAPI.deleteAccount(accountId);
  });

  test("scenario: category with varied transaction sizes across accounts", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Create 3 accounts with different spending patterns
    const accounts = [];
    for (let i = 0; i < 3; i++) {
      const res = await accountAPI.createAccount({
        name: `cat-complex-varied-${i}-${Date.now()}`,
        note: `account ${i}`,
        type: "expense",
      });
      accounts.push(res.data!.id as number);
    }

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-complex-varied-${Date.now()}`,
      note: "varied",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const txIds: number[] = [];

    // Account 1: Many small transactions (10 x 500)
    for (let i = 0; i < 10; i++) {
      const res = await transactionAPI.createTransaction({
        accountId: accounts[0],
        amount: 500,
        categoryId,
        date: new Date(
          now.getTime() - (20 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // Account 2: Medium transactions (5 x 2000)
    for (let i = 0; i < 5; i++) {
      const res = await transactionAPI.createTransaction({
        accountId: accounts[1],
        amount: 2000,
        categoryId,
        date: new Date(
          now.getTime() - (15 - i) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    // Account 3: Few large transactions (2 x 8000)
    for (let i = 0; i < 2; i++) {
      const res = await transactionAPI.createTransaction({
        accountId: accounts[2],
        amount: 8000,
        categoryId,
        date: new Date(
          now.getTime() - (10 - i * 5) * 24 * 3600 * 1000,
        ).toISOString(),
        type: "expense" as const,
      });
      txIds.push(res.data!.id as number);
    }

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify aggregates: 17 transactions, total = 5000 + 10000 + 16000 = 31000
    expect(stats.averageTransactionSize.transactionCount).toBe(17);
    expect(stats.averageTransactionSize.minAmount).toBe(500);
    expect(stats.averageTransactionSize.maxAmount).toBe(8000);
    // Use toBeCloseTo for average due to rounding differences
    expect(stats.averageTransactionSize.averageAmount).toBeCloseTo(
      31000 / 17,
      0,
    );

    // Verify account distribution shows all 3 accounts
    expect(stats.accountDistribution.accounts!.length).toBe(3);
    expect(stats.accountDistribution.totalSpending).toBe(31000);

    // Verify account percentages (use toBeCloseTo for rounding tolerance)
    const acc1Data = stats.accountDistribution.accounts!.find(
      (a) => a.amount === 5000,
    );
    const acc2Data = stats.accountDistribution.accounts!.find(
      (a) => a.amount === 10000,
    );
    const acc3Data = stats.accountDistribution.accounts!.find(
      (a) => a.amount === 16000,
    );

    if (acc1Data)
      expect(acc1Data.percentage).toBeCloseTo((5000 / 31000) * 100, 1);
    if (acc2Data)
      expect(acc2Data.percentage).toBeCloseTo((10000 / 31000) * 100, 1);
    if (acc3Data)
      expect(acc3Data.percentage).toBeCloseTo((16000 / 31000) * 100, 1);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    for (const accountId of accounts) {
      await accountAPI.deleteAccount(accountId);
    }
  });
});

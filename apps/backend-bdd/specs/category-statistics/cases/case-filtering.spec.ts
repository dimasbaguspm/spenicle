import { test, expect } from "@fixtures/index";

test.describe("Category Statistics - Filtering and Aggregation", () => {
  test("multiple transactions per category are correctly aggregated", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-filter-agg-${Date.now()}`,
      note: "aggregation test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-filter-agg-${Date.now()}`,
      note: "test category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create multiple transactions
    const amounts = [1000, 2000, 3000, 1500];
    const txIds: number[] = [];

    for (let i = 0; i < amounts.length; i++) {
      const res = await transactionAPI.createTransaction({
        accountId,
        amount: amounts[i],
        categoryId,
        date: new Date(
          now.getTime() - (10 - i) * 24 * 3600 * 1000,
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

    // Verify aggregation
    expect(stats.averageTransactionSize.transactionCount).toBe(4);
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    expect(stats.averageTransactionSize.averageAmount).toBe(
      Math.floor(totalAmount / 4),
    );
    expect(stats.averageTransactionSize.minAmount).toBe(1000);
    expect(stats.averageTransactionSize.maxAmount).toBe(3000);

    // Verify spending velocity
    expect(stats.spendingVelocity.data!.length).toBeGreaterThan(0);

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("transactions across multiple accounts are all included in aggregates", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const account1Res = await accountAPI.createAccount({
      name: `cat-filter-acc1-${Date.now()}`,
      note: "account 1",
      type: "expense",
    });
    const account1Id = account1Res.data!.id as number;

    const account2Res = await accountAPI.createAccount({
      name: `cat-filter-acc2-${Date.now()}`,
      note: "account 2",
      type: "expense",
    });
    const account2Id = account2Res.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-filter-multi-acc-${Date.now()}`,
      note: "multi account",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions from both accounts
    const tx1Res = await transactionAPI.createTransaction({
      accountId: account1Id,
      amount: 5000,
      categoryId,
      date: new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const tx2Res = await transactionAPI.createTransaction({
      accountId: account2Id,
      amount: 3000,
      categoryId,
      date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify both accounts are included
    expect(stats.accountDistribution.accounts!.length).toBe(2);
    expect(stats.accountDistribution.totalSpending).toBe(8000);

    // Verify transactions are counted correctly
    expect(stats.averageTransactionSize.transactionCount).toBe(2);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1Res.data!.id as number);
    await transactionAPI.deleteTransaction(tx2Res.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(account1Id);
    await accountAPI.deleteAccount(account2Id);
  });

  test("date range filtering excludes transactions outside the range", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-filter-date-${Date.now()}`,
      note: "date filtering",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-filter-date-${Date.now()}`,
      note: "date filter test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();

    // Create transactions on different dates
    const beforeRes = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const withinRes = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const afterRes = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId,
      date: new Date(now.getTime() + 40 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Query with narrow date range
    const startDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 10 * 24 * 3600 * 1000);

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Only transaction within range should be counted
    expect(stats.averageTransactionSize.transactionCount).toBe(1);
    expect(stats.averageTransactionSize.averageAmount).toBe(2000);
    expect(stats.averageTransactionSize.minAmount).toBe(2000);
    expect(stats.averageTransactionSize.maxAmount).toBe(2000);

    // Cleanup
    await transactionAPI.deleteTransaction(beforeRes.data!.id as number);
    await transactionAPI.deleteTransaction(withinRes.data!.id as number);
    await transactionAPI.deleteTransaction(afterRes.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("account distribution shows correct percentage calculations", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const account1Res = await accountAPI.createAccount({
      name: `cat-filter-pct-acc1-${Date.now()}`,
      note: "account 1",
      type: "expense",
    });
    const account1Id = account1Res.data!.id as number;

    const account2Res = await accountAPI.createAccount({
      name: `cat-filter-pct-acc2-${Date.now()}`,
      note: "account 2",
      type: "expense",
    });
    const account2Id = account2Res.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-filter-pct-${Date.now()}`,
      note: "percentage test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Account 1: 75, Account 2: 25 (3:1 ratio)
    const tx1Res = await transactionAPI.createTransaction({
      accountId: account1Id,
      amount: 7500,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const tx2Res = await transactionAPI.createTransaction({
      accountId: account2Id,
      amount: 2500,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;
    const distribution = stats.accountDistribution;

    // Verify total
    expect(distribution.totalSpending).toBe(10000);

    // Verify percentages
    const account1Data = distribution.accounts!.find((a) => a.amount === 7500);
    const account2Data = distribution.accounts!.find((a) => a.amount === 2500);

    expect(account1Data?.percentage).toBe(75);
    expect(account2Data?.percentage).toBe(25);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1Res.data!.id as number);
    await transactionAPI.deleteTransaction(tx2Res.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(account1Id);
    await accountAPI.deleteAccount(account2Id);
  });
});

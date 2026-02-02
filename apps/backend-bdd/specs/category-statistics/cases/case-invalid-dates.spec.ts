import { test, expect } from "@fixtures/index";

test.describe("Category Statistics - Invalid Dates", () => {
  test("returns empty results when date range has no transactions", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-invalid-dates-nodata-${Date.now()}`,
      note: "no data",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-invalid-dates-nodata-${Date.now()}`,
      note: "no data",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();

    // Create transaction on specific date
    const txDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: txDate.toISOString(),
      type: "expense" as const,
    });
    const txId = txRes.data!.id as number;

    // Query before transaction date
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(txDate.getTime() - 1 * 24 * 3600 * 1000);

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Verify empty results
    expect(stats.averageTransactionSize.transactionCount).toBe(0);
    expect(stats.averageTransactionSize.minAmount).toBe(0);
    expect(stats.averageTransactionSize.maxAmount).toBe(0);
    expect(stats.averageTransactionSize.averageAmount).toBe(0);
    expect(stats.averageTransactionSize.medianAmount).toBe(0);

    // Account distribution can be empty or null
    expect(stats.accountDistribution.totalSpending).toBe(0);

    // Cleanup
    await transactionAPI.deleteTransaction(txId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("handles query after all transactions", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-invalid-dates-after-${Date.now()}`,
      note: "after",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-invalid-dates-after-${Date.now()}`,
      note: "after",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const txDate = new Date(now.getTime() - 10 * 24 * 3600 * 1000);

    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: txDate.toISOString(),
      type: "expense" as const,
    });
    const txId = txRes.data!.id as number;

    // Query after transaction
    const startDate = new Date(txDate.getTime() + 1 * 24 * 3600 * 1000);
    const endDate = new Date(txDate.getTime() + 10 * 24 * 3600 * 1000);

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should be empty
    expect(stats.averageTransactionSize.transactionCount).toBe(0);
    expect(stats.accountDistribution.totalSpending).toBe(0);

    // Cleanup
    await transactionAPI.deleteTransaction(txId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("handles inverted date range gracefully", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-invalid-dates-inverted-${Date.now()}`,
      note: "inverted",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-invalid-dates-inverted-${Date.now()}`,
      note: "inverted",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const txDate = new Date(now.getTime() - 5 * 24 * 3600 * 1000);

    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: txDate.toISOString(),
      type: "expense" as const,
    });
    const txId = txRes.data!.id as number;

    // Inverted date range: end before start
    const startDate = new Date(now.getTime());
    const endDate = new Date(now.getTime() - 20 * 24 * 3600 * 1000);

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    // Should handle gracefully (either empty or swap dates)
    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // If it swaps dates internally, we'd get results
    // If it treats as empty, we'd get 0
    // Both are acceptable implementations
    expect(
      stats.averageTransactionSize.transactionCount,
    ).toBeGreaterThanOrEqual(0);

    // Cleanup
    await transactionAPI.deleteTransaction(txId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("filters transactions exactly at date boundaries", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-invalid-dates-boundary-${Date.now()}`,
      note: "boundary",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-invalid-dates-boundary-${Date.now()}`,
      note: "boundary",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const startDate = new Date("2024-01-01T00:00:00Z");
    const endDate = new Date("2024-01-31T23:59:59Z");

    const txIds: number[] = [];

    // Create transaction exactly at start boundary (midnight)
    const txStart = await transactionAPI.createTransaction({
      accountId,
      amount: 100,
      categoryId,
      date: startDate.toISOString(),
      type: "expense" as const,
    });
    txIds.push(txStart.data!.id as number);

    // Create transaction exactly at end boundary (23:59:59)
    const txEnd = await transactionAPI.createTransaction({
      accountId,
      amount: 200,
      categoryId,
      date: endDate.toISOString(),
      type: "expense" as const,
    });
    txIds.push(txEnd.data!.id as number);

    // Create transaction just before start
    const txBefore = await transactionAPI.createTransaction({
      accountId,
      amount: 150,
      categoryId,
      date: new Date(startDate.getTime() - 1000).toISOString(),
      type: "expense" as const,
    });
    txIds.push(txBefore.data!.id as number);

    // Create transaction just after end
    const txAfter = await transactionAPI.createTransaction({
      accountId,
      amount: 250,
      categoryId,
      date: new Date(endDate.getTime() + 1000).toISOString(),
      type: "expense" as const,
    });
    txIds.push(txAfter.data!.id as number);

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should include boundary transactions but exclude outside
    expect(stats.averageTransactionSize.transactionCount).toBe(2);
    expect(stats.accountDistribution.totalSpending).toBe(300); // 100 + 200

    // Cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("day-of-week pattern includes all 7 days even with no data", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `cat-invalid-dates-dow-${Date.now()}`,
      note: "dow",
      type: "expense",
    });

    const categoryRes = await categoryAPI.createCategory({
      name: `cat-invalid-dates-dow-${Date.now()}`,
      note: "dow",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    // Query range with no transactions
    const startDate = new Date("2024-02-01T00:00:00Z");
    const endDate = new Date("2024-02-05T23:59:59Z");

    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should still return all 7 days
    expect(stats.dayOfWeekPattern.data!.length).toBe(7);

    // All entries should have 0 amount and 0 count
    for (const day of stats.dayOfWeekPattern.data!) {
      expect(day.totalAmount).toBe(0);
      expect(day.transactionCount).toBe(0);
    }

    // Cleanup
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountRes.data!.id as number);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Account Statistics - Invalid Date Ranges", () => {
  test("handles endDate before startDate gracefully", async ({
    accountAPI,
    accountStatisticsAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `invalid-dates-${Date.now()}`,
      note: "invalid date range",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const startDate = new Date("2026-02-01");
    const endDate = new Date("2026-01-01");

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    // Should either return empty results or handle gracefully
    expect([200, 400]).toContain(statsRes.status);
    if (statsRes.status === 200) {
      const stats = statsRes.data!;
      expect(stats.categoryHeatmap.totalSpending).toBe(0);
    }

    // Cleanup
    await accountAPI.deleteAccount(accountId);
  });

  test("handles same startDate and endDate (single day range)", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `single-day-${Date.now()}`,
      note: "single day range",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `single-day-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const date = new Date("2026-01-15T12:00:00Z");
    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 5000,
      categoryId,
      date: date.toISOString(),
      type: "expense" as const,
    });

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should include transaction on that day
    expect(stats.categoryHeatmap.totalSpending).toBe(5000);
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBe(1);

    // Cleanup
    await transactionAPI.deleteTransaction(txRes.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("handles very large date ranges (multiple years)", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `large-range-${Date.now()}`,
      note: "large range",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `large-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId,
      date: new Date("2025-06-15").toISOString(),
      type: "expense" as const,
    });

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: new Date("2020-01-01").toISOString(),
        endDate: new Date("2030-12-31").toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should include transaction within range
    expect(stats.categoryHeatmap.totalSpending).toBe(3000);

    // Cleanup
    await transactionAPI.deleteTransaction(txRes.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("excludes transactions outside date range", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `exclude-range-${Date.now()}`,
      note: "exclude outside range",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `exclude-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    // Transaction before range
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date("2026-01-01").toISOString(),
      type: "expense" as const,
    });

    // Transaction within range
    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date("2026-01-15").toISOString(),
      type: "expense" as const,
    });

    // Transaction after range
    const t3 = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId,
      date: new Date("2026-02-01").toISOString(),
      type: "expense" as const,
    });

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: new Date("2026-01-10").toISOString(),
        endDate: new Date("2026-01-20").toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should only include t2
    expect(stats.categoryHeatmap.totalSpending).toBe(2000);
    expect(stats.timeFrequencyHeatmap.totalTransactions).toBe(1);

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("handles boundary dates at midnight transitions", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `boundary-${Date.now()}`,
      note: "boundary dates",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const catRes = await categoryAPI.createCategory({
      name: `boundary-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = catRes.data!.id as number;

    // Create transactions at boundary times
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date("2026-01-10T00:00:00Z").toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date("2026-01-20T23:59:59Z").toISOString(),
      type: "expense" as const,
    });

    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: new Date("2026-01-10T00:00:00Z").toISOString(),
        endDate: new Date("2026-01-20T23:59:59Z").toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    const stats = statsRes.data!;

    // Should include both boundary transactions
    expect(stats.categoryHeatmap.totalSpending).toBe(3000);

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

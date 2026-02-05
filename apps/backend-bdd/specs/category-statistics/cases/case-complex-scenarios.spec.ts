import { test, expect } from "@fixtures/index";

test.describe("Category Statistics - Complex Scenarios", () => {
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

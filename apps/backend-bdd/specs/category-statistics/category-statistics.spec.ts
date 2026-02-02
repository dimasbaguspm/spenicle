import { test, expect } from "@fixtures/index";

test.describe("Category Statistics - Common", () => {
  test("GET /categories/:id/statistics - return comprehensive response shape", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Create account
    const accountRes = await accountAPI.createAccount({
      name: `cat-stats-test-${Date.now()}`,
      note: "category statistics test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    // Create category
    const categoryRes = await categoryAPI.createCategory({
      name: `cat-stats-${Date.now()}`,
      note: "test category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    // Create transactions
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get comprehensive category statistics
    const statsRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    expect(statsRes.data).toBeDefined();
    const stats = statsRes.data!;

    // Verify response structure
    expect(stats.accountDistribution).toBeDefined();
    expect(stats.averageTransactionSize).toBeDefined();
    expect(stats.budgetUtilization).toBeDefined();
    expect(stats.dayOfWeekPattern).toBeDefined();
    expect(stats.spendingVelocity).toBeDefined();

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /categories/:id/statistics/spending-velocity - return spending trend data", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `velocity-test-${Date.now()}`,
      note: "velocity test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `velocity-cat-${Date.now()}`,
      note: "velocity category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions over multiple days
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 500,
      categoryId,
      date: new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 750,
      categoryId,
      date: new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t3 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get spending velocity
    const velocityRes = await categoryStatisticsAPI.getSpendingVelocity(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(velocityRes.status).toBe(200);
    expect(velocityRes.data).toBeDefined();
    const velocity = velocityRes.data!;

    // Verify structure
    expect(velocity.data).toBeDefined();
    expect(Array.isArray(velocity.data)).toBe(true);

    // Verify data entries have proper shape
    if (velocity.data && velocity.data.length > 0) {
      for (const entry of velocity.data) {
        expect(entry.month).toBeDefined();
        expect(entry.amount).toBeDefined();
        expect(typeof entry.amount).toBe("number");
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /categories/:id/statistics/account-distribution - return account spending breakdown", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Create multiple accounts
    const account1Res = await accountAPI.createAccount({
      name: `dist-account1-${Date.now()}`,
      note: "distribution test",
      type: "expense",
    });
    const account1Id = account1Res.data!.id as number;

    const account2Res = await accountAPI.createAccount({
      name: `dist-account2-${Date.now()}`,
      note: "distribution test",
      type: "expense",
    });
    const account2Id = account2Res.data!.id as number;

    // Create category
    const categoryRes = await categoryAPI.createCategory({
      name: `dist-cat-${Date.now()}`,
      note: "distribution category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions in different accounts
    const t1 = await transactionAPI.createTransaction({
      accountId: account1Id,
      amount: 5000,
      categoryId,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId: account2Id,
      amount: 3000,
      categoryId,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get account distribution
    const distributionRes = await categoryStatisticsAPI.getAccountDistribution(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(distributionRes.status).toBe(200);
    expect(distributionRes.data).toBeDefined();
    const distribution = distributionRes.data!;

    // Verify structure
    expect(distribution.accounts).toBeDefined();
    expect(Array.isArray(distribution.accounts || [])).toBe(true);
    expect(distribution.totalSpending).toBeDefined();

    // Verify account data shape
    if (distribution.accounts && distribution.accounts.length > 0) {
      for (const entry of distribution.accounts) {
        expect(entry.accountId).toBeDefined();
        expect(entry.accountName).toBeDefined();
        expect(entry.amount).toBeDefined();
        expect(entry.percentage).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(account1Id);
    await accountAPI.deleteAccount(account2Id);
  });

  test("GET /categories/:id/statistics/average-transaction-size - return transaction size metrics", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `avg-tx-test-${Date.now()}`,
      note: "average transaction test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `avg-tx-cat-${Date.now()}`,
      note: "average transaction category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions with varying amounts
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 100,
      categoryId,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 500,
      categoryId,
      date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t3 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get average transaction size
    const avgRes = await categoryStatisticsAPI.getAverageTransactionSize(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(avgRes.status).toBe(200);
    expect(avgRes.data).toBeDefined();
    const metrics = avgRes.data!;

    // Verify structure
    expect(metrics.averageAmount).toBeDefined();
    expect(metrics.medianAmount).toBeDefined();
    expect(metrics.minAmount).toBeDefined();
    expect(metrics.maxAmount).toBeDefined();
    expect(metrics.transactionCount).toBe(3);

    // Verify values make sense
    expect(Number(metrics.averageAmount || 0)).toBeGreaterThan(0);
    expect(Number(metrics.minAmount || 0)).toBeLessThanOrEqual(
      Number(metrics.maxAmount || 0),
    );

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /categories/:id/statistics/day-of-week-pattern - return day-of-week spending pattern", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `dow-pattern-test-${Date.now()}`,
      note: "day of week test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `dow-cat-${Date.now()}`,
      note: "day of week category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions on different days of the week
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 200,
      categoryId,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 300,
      categoryId,
      date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t3 = await transactionAPI.createTransaction({
      accountId,
      amount: 400,
      categoryId,
      date: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get day of week pattern
    const patternRes = await categoryStatisticsAPI.getDayOfWeekPattern(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(patternRes.status).toBe(200);
    expect(patternRes.data).toBeDefined();
    const pattern = patternRes.data!;

    // Verify structure
    expect(pattern.data).toBeDefined();
    expect(Array.isArray(pattern.data)).toBe(true);
    if (pattern.data) {
      expect(pattern.data.length).toBe(7);

      // Verify day data shape
      for (const day of pattern.data) {
        expect(day.dayOfWeek).toBeDefined();
        expect(day.totalAmount).toBeDefined();
        expect(day.transactionCount).toBeDefined();
        expect(day.averageAmount).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /categories/:id/statistics/budget-utilization - return budget vs spending data", async ({
    accountAPI,
    budgetAPI,
    categoryAPI,
    categoryStatisticsAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `budget-util-test-${Date.now()}`,
      note: "budget utilization test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `budget-util-cat-${Date.now()}`,
      note: "budget utilization category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create a budget
    const budgetRes = await budgetAPI.createBudget({
      name: `budget-${Date.now()}`,
      categoryId,
      amountLimit: 5000,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });
    const budgetId = budgetRes.data!.id as number;

    // Create transactions
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1500,
      categoryId,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get budget utilization
    const utilizationRes = await categoryStatisticsAPI.getBudgetUtilization(
      categoryId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(utilizationRes.status).toBe(200);
    expect(utilizationRes.data).toBeDefined();
    const utilization = utilizationRes.data!;

    // Verify structure
    expect(utilization.budgets).toBeDefined();
    expect(Array.isArray(utilization.budgets || [])).toBe(true);

    // Verify budget data shape
    if (utilization.budgets && utilization.budgets.length > 0) {
      for (const budget of utilization.budgets) {
        expect(budget.budgetId).toBeDefined();
        expect(budget.name).toBeDefined();
        expect(budget.limit).toBeDefined();
        expect(budget.spent).toBeDefined();
        expect(budget.utilization).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("Category statistics endpoints return 404 for non-existent category", async ({
    categoryStatisticsAPI,
  }) => {
    const nonExistentId = 99999;
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    // Test all endpoints with non-existent category
    const comprehensiveRes = await categoryStatisticsAPI.getCategoryStatistics(
      nonExistentId,
      params,
    );
    expect(comprehensiveRes.status).toBe(404);

    const velocityRes = await categoryStatisticsAPI.getSpendingVelocity(
      nonExistentId,
      params,
    );
    expect(velocityRes.status).toBe(404);

    const distributionRes = await categoryStatisticsAPI.getAccountDistribution(
      nonExistentId,
      params,
    );
    expect(distributionRes.status).toBe(404);

    const avgRes = await categoryStatisticsAPI.getAverageTransactionSize(
      nonExistentId,
      params,
    );
    expect(avgRes.status).toBe(404);

    const patternRes = await categoryStatisticsAPI.getDayOfWeekPattern(
      nonExistentId,
      params,
    );
    expect(patternRes.status).toBe(404);

    const budgetRes = await categoryStatisticsAPI.getBudgetUtilization(
      nonExistentId,
      params,
    );
    expect(budgetRes.status).toBe(404);
  });

  test("Category statistics endpoints handle empty periods gracefully", async ({
    accountAPI,
    categoryAPI,
    categoryStatisticsAPI,
  }) => {
    // Create account and category without any transactions
    const accountRes = await accountAPI.createAccount({
      name: `empty-period-test-${Date.now()}`,
      note: "empty period test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `empty-period-cat-${Date.now()}`,
      note: "empty period category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    // Test all endpoints with empty period
    const comprehensiveRes = await categoryStatisticsAPI.getCategoryStatistics(
      categoryId,
      params,
    );
    expect(comprehensiveRes.status).toBe(200);
    expect(comprehensiveRes.data).toBeDefined();

    const velocityRes = await categoryStatisticsAPI.getSpendingVelocity(
      categoryId,
      params,
    );
    expect(velocityRes.status).toBe(200);
    expect(velocityRes.data).toBeDefined();

    const distributionRes = await categoryStatisticsAPI.getAccountDistribution(
      categoryId,
      params,
    );
    expect(distributionRes.status).toBe(200);
    expect(distributionRes.data).toBeDefined();

    const avgRes = await categoryStatisticsAPI.getAverageTransactionSize(
      categoryId,
      params,
    );
    expect(avgRes.status).toBe(200);
    expect(avgRes.data).toBeDefined();

    const patternRes = await categoryStatisticsAPI.getDayOfWeekPattern(
      categoryId,
      params,
    );
    expect(patternRes.status).toBe(200);
    expect(patternRes.data).toBeDefined();

    const budgetRes = await categoryStatisticsAPI.getBudgetUtilization(
      categoryId,
      params,
    );
    expect(budgetRes.status).toBe(200);
    expect(budgetRes.data).toBeDefined();

    // Cleanup
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

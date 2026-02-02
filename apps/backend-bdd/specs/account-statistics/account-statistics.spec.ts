import { test, expect } from "@fixtures/index";

test.describe("Account Statistics - Common", () => {
  test("GET /accounts/:id/statistics - return comprehensive response shape", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Create account
    const accountRes = await accountAPI.createAccount({
      name: `stats-test-${Date.now()}`,
      note: "statistics test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    // Create category
    const categoryRes = await categoryAPI.createCategory({
      name: `stats-cat-${Date.now()}`,
      note: "test category",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    // Create transactions with dates
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

    // Get comprehensive statistics
    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(statsRes.status).toBe(200);
    expect(statsRes.data).toBeDefined();
    const stats = statsRes.data!;

    // Verify response structure
    expect(stats.accountId).toBe(accountId);
    expect(stats.period).toBeDefined();
    expect(stats.categoryHeatmap).toBeDefined();
    expect(stats.monthlyVelocity).toBeDefined();
    expect(stats.timeFrequencyHeatmap).toBeDefined();
    expect(stats.cashFlowPulse).toBeDefined();
    expect(stats.burnRate).toBeDefined();
    expect(stats.budgetHealth).toBeDefined();

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/category-heatmap - return category spending data", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `heatmap-test-${Date.now()}`,
      note: "heatmap test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const cat1 = await categoryAPI.createCategory({
      name: `heatmap-cat1-${Date.now()}`,
      note: "cat1",
      type: "expense",
    });
    const cat2 = await categoryAPI.createCategory({
      name: `heatmap-cat2-${Date.now()}`,
      note: "cat2",
      type: "expense",
    });

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions in different categories
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 5000,
      categoryId: cat1.data!.id as number,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 3000,
      categoryId: cat2.data!.id as number,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get category heatmap
    const heatmapRes = await accountStatisticsAPI.getCategoryHeatmap(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(heatmapRes.status).toBe(200);
    expect(heatmapRes.data).toBeDefined();
    const heatmap = heatmapRes.data!;

    // Verify structure
    expect(heatmap.data).toBeDefined();
    expect(Array.isArray(heatmap.data)).toBe(true);
    expect(heatmap.totalSpending).toBeDefined();
    expect(Number(heatmap.totalSpending || 0)).toBeGreaterThan(0);
    expect(heatmap.categoryCount).toBeGreaterThanOrEqual(2);

    // Verify category data shape
    if (heatmap.data && heatmap.data.length > 0) {
      for (const entry of heatmap.data) {
        expect(entry.categoryId).toBeDefined();
        expect(entry.categoryName).toBeDefined();
        expect(entry.totalAmount).toBeDefined();
        expect(entry.totalCount).toBeDefined();
        expect(entry.percentageOfTotal).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(cat1.data!.id as number);
    await categoryAPI.deleteCategory(cat2.data!.id as number);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/monthly-velocity - return monthly spending trends", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
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
      note: "test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Create transactions across multiple months
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
      type: "expense" as const,
    });

    // Get monthly velocity
    const velocityRes = await accountStatisticsAPI.getMonthlyVelocity(
      accountId,
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
    expect(velocity.averageMonthlySpend).toBeDefined();
    expect(velocity.trendDirection).toBeDefined();
    expect(["increasing", "decreasing", "stable"]).toContain(
      velocity.trendDirection,
    );

    // Verify entry shape
    if (velocity.data && velocity.data.length > 0) {
      for (const entry of velocity.data) {
        expect(entry.period).toBeDefined();
        expect(entry.totalCount).toBeDefined();
        expect(entry.incomeCount).toBeDefined();
        expect(entry.expenseCount).toBeDefined();
        expect(entry.transferCount).toBeDefined();
        expect(entry.incomeAmount).toBeDefined();
        expect(entry.expenseAmount).toBeDefined();
        expect(entry.dailyAverage).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/time-frequency - return transaction frequency distribution", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `frequency-test-${Date.now()}`,
      note: "frequency test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `frequency-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transaction
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 1000,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    // Get time frequency
    const frequencyRes = await accountStatisticsAPI.getTimeFrequencyHeatmap(
      accountId,
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    );

    expect(frequencyRes.status).toBe(200);
    expect(frequencyRes.data).toBeDefined();
    const frequency = frequencyRes.data!;

    // Verify structure
    expect(frequency.data).toBeDefined();
    expect(Array.isArray(frequency.data)).toBe(true);
    expect(frequency.mostCommonPattern).toBeDefined();
    expect(frequency.totalTransactions).toBeDefined();

    // Verify entry shape
    if (frequency.data && frequency.data.length > 0) {
      for (const entry of frequency.data) {
        expect(entry.frequency).toBeDefined();
        expect(entry.count).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/cash-flow-pulse - return balance trend", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `cashflow-test-${Date.now()}`,
      note: "cashflow test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `cashflow-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions
    const t1 = await transactionAPI.createTransaction({
      accountId,
      amount: 5000,
      categoryId,
      date: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      type: "expense" as const,
    });

    // Get cash flow pulse
    const cashFlowRes = await accountStatisticsAPI.getCashFlowPulse(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(cashFlowRes.status).toBe(200);
    expect(cashFlowRes.data).toBeDefined();
    const cashFlow = cashFlowRes.data!;

    // Verify structure
    expect(cashFlow.data).toBeDefined();
    expect(Array.isArray(cashFlow.data)).toBe(true);
    expect(cashFlow.startingBalance).toBeDefined();
    expect(cashFlow.endingBalance).toBeDefined();
    expect(cashFlow.trendDirection).toBeDefined();

    // Verify data point shape
    if (cashFlow.data && cashFlow.data.length > 0) {
      for (const point of cashFlow.data) {
        expect(point.date).toBeDefined();
        expect(point.balance).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/burn-rate - return spending analysis", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Setup
    const accountRes = await accountAPI.createAccount({
      name: `burnrate-test-${Date.now()}`,
      note: "burnrate test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `burnrate-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    // Create transactions across multiple days
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

    // Get burn rate
    const burnRateRes = await accountStatisticsAPI.getBurnRate(accountId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(burnRateRes.status).toBe(200);
    expect(burnRateRes.data).toBeDefined();
    const burnRate = burnRateRes.data!;

    // Verify structure
    expect(burnRate.dailyAverageSpend).toBeDefined();
    expect(burnRate.weeklyAverageSpend).toBeDefined();
    expect(burnRate.monthlyAverageSpend).toBeDefined();
    expect(burnRate.budgetLimitStatus).toBeDefined();
    expect(["within", "at-risk", "exceeded", "no-budget"]).toContain(
      burnRate.budgetLimitStatus,
    );
    expect(burnRate.totalSpending).toBeDefined();

    // Cleanup
    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/budget-health - return budget status", async ({
    accountAPI,
    accountStatisticsAPI,
    categoryAPI,
    transactionAPI,
    budgetAPI,
  }) => {
    // Setup account with transactions and budget
    const accountRes = await accountAPI.createAccount({
      name: `budget-health-test-${Date.now()}`,
      note: "budget health test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `budget-health-cat-${Date.now()}`,
      note: "test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    // Create budget
    const now = new Date();
    const budgetStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const budgetEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: `health-budget-${Date.now()}`,
      amountLimit: 10000,
      periodStart: budgetStart.toISOString(),
      periodEnd: budgetEnd.toISOString(),
    });
    const budgetId = budgetRes.data!.id as number;

    // Create transaction
    const txRes = await transactionAPI.createTransaction({
      accountId,
      amount: 2000,
      categoryId,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const statsStart = new Date(budgetStart.getTime() - 30 * 24 * 3600 * 1000);
    const statsEnd = new Date(budgetEnd.getTime() + 5 * 24 * 3600 * 1000);

    // Get budget health
    const healthRes = await accountStatisticsAPI.getBudgetHealth(accountId, {
      startDate: statsStart.toISOString(),
      endDate: statsEnd.toISOString(),
    });

    expect(healthRes.status).toBe(200);
    expect(healthRes.data).toBeDefined();
    const health = healthRes.data!;

    // Verify structure
    expect(health.activeBudgets).toBeDefined();
    expect(Array.isArray(health.activeBudgets)).toBe(true);
    expect(health.pastBudgets).toBeDefined();
    expect(Array.isArray(health.pastBudgets)).toBe(true);
    expect(health.achievementRate).toBeDefined();

    // Verify budget entry shape
    if (health.activeBudgets && health.activeBudgets.length > 0) {
      for (const entry of health.activeBudgets) {
        expect(entry.budgetId).toBeDefined();
        expect(entry.budgetName).toBeDefined();
        expect(entry.periodStart).toBeDefined();
        expect(entry.periodEnd).toBeDefined();
        expect(entry.amountLimit).toBeDefined();
        expect(entry.amountSpent).toBeDefined();
        expect(entry.percentageUsed).toBeDefined();
        expect(entry.status).toBeDefined();
        expect(entry.daysRemaining).toBeDefined();
      }
    }

    // Cleanup
    await transactionAPI.deleteTransaction(txRes.data!.id as number);
    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/* - empty range returns valid response", async ({
    accountAPI,
    accountStatisticsAPI,
  }) => {
    // Create account but don't add any transactions
    const accountRes = await accountAPI.createAccount({
      name: `empty-stats-test-${Date.now()}`,
      note: "empty test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    // Use far future date range with no transactions
    const farFuture = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365,
    ).toISOString();
    const farFutureEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 366,
    ).toISOString();

    // Test all statistics endpoints with empty range
    const statsRes = await accountStatisticsAPI.getAccountStatistics(
      accountId,
      {
        startDate: farFuture,
        endDate: farFutureEnd,
      },
    );
    expect(statsRes.status).toBe(200);
    expect(statsRes.data).toBeDefined();
    expect(statsRes.data!.accountId).toBe(accountId);

    const heatmapRes = await accountStatisticsAPI.getCategoryHeatmap(
      accountId,
      {
        startDate: farFuture,
        endDate: farFutureEnd,
      },
    );
    expect(heatmapRes.status).toBe(200);
    expect(heatmapRes.data).toBeDefined();

    const velocityRes = await accountStatisticsAPI.getMonthlyVelocity(
      accountId,
      {
        startDate: farFuture,
        endDate: farFutureEnd,
      },
    );
    expect(velocityRes.status).toBe(200);
    expect(velocityRes.data).toBeDefined();

    const frequencyRes = await accountStatisticsAPI.getTimeFrequencyHeatmap(
      accountId,
      {
        startDate: farFuture,
        endDate: farFutureEnd,
      },
    );
    expect(frequencyRes.status).toBe(200);
    expect(frequencyRes.data).toBeDefined();

    const cashFlowRes = await accountStatisticsAPI.getCashFlowPulse(accountId, {
      startDate: farFuture,
      endDate: farFutureEnd,
    });
    expect(cashFlowRes.status).toBe(200);
    expect(cashFlowRes.data).toBeDefined();

    const burnRateRes = await accountStatisticsAPI.getBurnRate(accountId, {
      startDate: farFuture,
      endDate: farFutureEnd,
    });
    expect(burnRateRes.status).toBe(200);
    expect(burnRateRes.data).toBeDefined();

    const healthRes = await accountStatisticsAPI.getBudgetHealth(accountId, {
      startDate: farFuture,
      endDate: farFutureEnd,
    });
    expect(healthRes.status).toBe(200);
    expect(healthRes.data).toBeDefined();

    // Cleanup
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id/statistics/* - returns 401 without authentication", async ({
    accountStatisticsAPI,
    testContext,
  }) => {
    // Create a client without auth token
    const noAuthContext = { ...testContext, accessToken: "" };
    const client = new (accountStatisticsAPI.constructor as any)(
      accountStatisticsAPI["request"],
      noAuthContext,
    );

    const statsRes = await client.getAccountStatistics(999, {
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    });

    expect(statsRes.status).toBe(401);
  });

  test("GET /accounts/:id/statistics/* - returns 404 for non-existent account", async ({
    accountStatisticsAPI,
  }) => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const endDate = new Date(now.getTime() + 5 * 24 * 3600 * 1000);

    const statsRes = await accountStatisticsAPI.getAccountStatistics(999999, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(statsRes.status).toBe(404);
  });
});

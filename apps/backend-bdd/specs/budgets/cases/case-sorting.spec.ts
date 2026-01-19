import { test, expect } from "@fixtures/index";

test.describe("Budgets - Sorting Cases", () => {
  test("GET /budgets - sort by amountLimit desc returns budgets in correct order", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-sort-account-${Date.now()}`,
      note: "sort test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    // Create budgets with different amounts and periods
    const budgets = [];
    const budgetConfigs = [
      { amount: 500, periodStart: "2026-01-01", periodEnd: "2026-01-31" }, // monthly
      { amount: 1500, periodStart: "2026-02-01", periodEnd: "2026-02-07" }, // weekly
      { amount: 1000, periodStart: "2026-03-01", periodEnd: "2026-12-31" }, // yearly
    ];
    for (const config of budgetConfigs) {
      const res = await budgetAPI.createBudget({
        accountId,
        name: `Budget ${config.amount}`,
        periodStart: new Date(config.periodStart).toISOString(),
        periodEnd: new Date(config.periodEnd).toISOString(),
        amountLimit: config.amount,
      });
      budgets.push({ id: res.data!.id as number, amount: config.amount });
    }

    // Sort by amountLimit desc
    const listRes = await budgetAPI.getBudgets({
      sortBy: "amountLimit",
      sortOrder: "desc",
    });
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(3);

    // Check descending order
    const sortedAmounts = items.map((item: any) => item.amountLimit);
    expect(sortedAmounts).toEqual([...sortedAmounts].sort((a, b) => b - a));

    // Cleanup
    for (const budget of budgets) {
      await budgetAPI.deleteBudget(budget.id);
    }
    await accountAPI.deleteAccount(accountId);
  });
});

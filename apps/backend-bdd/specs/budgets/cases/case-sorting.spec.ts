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

    // Create budgets with different amounts
    const budgets = [];
    const amounts = [500, 1500, 1000];
    for (const amount of amounts) {
      const res = await budgetAPI.createBudget({
        accountId,
        periodStart: new Date("2026-01-01").toISOString(),
        periodEnd: new Date("2026-01-31").toISOString(),
        amountLimit: amount,
      });
      budgets.push({ id: res.data!.id as number, amount });
    }

    // Sort by amountLimit desc
    const listRes = await budgetAPI.getBudgets({
      sortBy: "amountLimit",
      sortOrder: "desc",
    });
    expect(listRes.status).toBeGreaterThanOrEqual(200);
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

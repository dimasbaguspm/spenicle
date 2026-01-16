import { test, expect } from "@fixtures/index";

test.describe("Budgets - Create Account Only Cases", () => {
  test("POST /budgets - create budget with accountId only succeeds", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-account-only-${Date.now()}`,
      note: "account only test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.accountId).toBe(accountId);
    expect(res.data!.categoryId).toBeUndefined();

    const budgetId = res.data!.id as number;
    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });
});

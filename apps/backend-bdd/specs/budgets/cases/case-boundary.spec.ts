import { test, expect } from "@fixtures/index";

test.describe("Budgets - Boundary Cases", () => {
  test("POST /budgets - create budget with same start and end date succeeds", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-same-dates-${Date.now()}`,
      note: "boundary test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const date = new Date("2026-01-15").toISOString();
    const res = await budgetAPI.createBudget({
      accountId,
      periodStart: date,
      periodEnd: date,
      amountLimit: 1000,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data).toBeDefined();

    const budgetId = res.data!.id as number;
    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - create budget with very large amount succeeds", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-large-amount-${Date.now()}`,
      note: "boundary test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 999999999, // Very large amount
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data).toBeDefined();

    const budgetId = res.data!.id as number;
    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - create budget with minimum amount succeeds", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-min-amount-${Date.now()}`,
      note: "boundary test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1, // Minimum amount
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data).toBeDefined();

    const budgetId = res.data!.id as number;
    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Budgets - Update Validation Cases", () => {
  test("PATCH /budgets/:id - update with invalid accountId returns error", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-update-invalid-${Date.now()}`,
      note: "update test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Test Budget 1",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id as number;

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - update with invalid dates returns error", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-update-dates-${Date.now()}`,
      note: "update test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Test Budget 2",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id as number;

    const updateRes = await budgetAPI.updateBudget(budgetId, {
      periodStart: new Date("2026-01-31").toISOString(),
      periodEnd: new Date("2026-01-01").toISOString(),
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - update with negative amount returns error", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-update-amount-${Date.now()}`,
      note: "update test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Test Budget 3",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id as number;

    const updateRes = await budgetAPI.updateBudget(budgetId, {
      amountLimit: -100,
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });
});

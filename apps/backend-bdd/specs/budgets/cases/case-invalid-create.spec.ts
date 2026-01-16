import { test, expect } from "@fixtures/index";

test.describe("Budgets - Invalid Create Cases", () => {
  test("POST /budgets - invalid accountId returns error", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.createBudget({
      accountId: 999999, // Non-existent account
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /budgets - invalid period dates returns error", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-invalid-${Date.now()}`,
      note: "invalid test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      periodStart: new Date("2026-01-31").toISOString(), // Start after end
      periodEnd: new Date("2026-01-01").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - negative amountLimit returns error", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-negative-${Date.now()}`,
      note: "negative test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: -100,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(accountId);
  });
});

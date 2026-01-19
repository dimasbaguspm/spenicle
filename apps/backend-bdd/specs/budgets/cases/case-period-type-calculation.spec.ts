import { test, expect } from "@fixtures/index";

test.describe("Budgets - Period Type Calculation", () => {
  test("POST /budgets - creates weekly budget (7 days)", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-weekly-budget-${Date.now()}`,
      type: "expense",
      note: "custom period test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Weekly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-07").toISOString(), // Exactly 7 days
      amountLimit: 500,
    });

    expect(res.status).toBe(200);
    expect(res.data!.periodType).toBe("weekly");

    await budgetAPI.deleteBudget(res.data!.id);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - creates monthly budget (28-31 days)", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-monthly-budget-${Date.now()}`,
      type: "expense",
      note: "custom period test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Monthly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(), // 31 days
      amountLimit: 2000,
    });

    expect(res.status).toBe(200);
    expect(res.data!.periodType).toBe("monthly");

    await budgetAPI.deleteBudget(res.data!.id);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - creates yearly budget (365-366 days)", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-yearly-budget-${Date.now()}`,
      type: "expense",
      note: "custom period test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Yearly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-12-31").toISOString(), // 366 days (leap year)
      amountLimit: 12000,
    });

    expect(res.status).toBe(200);
    expect(res.data!.periodType).toBe("yearly");

    await budgetAPI.deleteBudget(res.data!.id);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - creates custom budget (other durations)", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-custom-budget-${Date.now()}`,
      type: "expense",
      note: "custom period test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Custom Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-15").toISOString(), // 15 days
      amountLimit: 750,
    });

    expect(res.status).toBe(200);
    expect(res.data!.periodType).toBe("custom");

    await budgetAPI.deleteBudget(res.data!.id);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - recalculates period type when dates change", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-recalc-budget-${Date.now()}`,
      type: "expense",
      note: "custom period test",
    });
    const accountId = accountRes.data!.id as number;

    // Create monthly budget
    const createRes = await budgetAPI.createBudget({
      accountId,
      name: "Recalc Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(createRes.data!.periodType).toBe("monthly");
    const budgetId = createRes.data!.id;

    // Update to weekly period
    const updateRes = await budgetAPI.updateBudget(budgetId, {
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-07").toISOString(),
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.periodType).toBe("weekly");

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });
});

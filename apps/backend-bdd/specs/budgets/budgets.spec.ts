import { test, expect } from "@fixtures/index";

test.describe("Budgets - Common CRUD", () => {
  test("POST /budgets - create budget", async ({ budgetAPI, accountAPI }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-account-${Date.now()}`,
      note: "budget test",
      type: "expense",
    });
    expect(accountRes.data).toBeDefined();
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Monthly Expense Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
      note: "Test budget for monthly expenses",
    });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.name).toBe("Monthly Expense Budget");
    expect(res.data!.periodType).toBe("monthly");
    expect(res.data!.status).toBe("active");
    expect(res.data!.note).toBe("Test budget for monthly expenses");

    await budgetAPI.deleteBudget(res.data!.id);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /budgets - list budgets returns items", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-list-${Date.now()}`,
      note: "list test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "List Test Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(budgetRes.status).toBe(200);
    expect(budgetRes.data).toBeDefined();
    const budgetId = budgetRes.data!.id as number;

    const listRes = await budgetAPI.getBudgets();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    // Check that our budget is in the list
    const ourBudget = items.find((b) => b.id === budgetId);
    expect(ourBudget).toBeDefined();
    expect(ourBudget!.name).toBe("List Test Budget");

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /budgets/:id - get budget by id", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-get-${Date.now()}`,
      note: "get test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Get Test Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(budgetRes.status).toBe(200);
    expect(budgetRes.data).toBeDefined();
    const budgetId = budgetRes.data!.id as number;

    const getRes = await budgetAPI.getBudget(budgetId);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(budgetId);
    expect(getRes.data!.name).toBe("Get Test Budget");
    expect(getRes.data!.periodType).toBe("monthly");
    expect(getRes.data!.status).toBe("active");

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - update budget", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-update-${Date.now()}`,
      note: "update test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Update Test Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id as number;

    const updateRes = await budgetAPI.updateBudget(budgetId, {
      name: "Updated Budget Name",
      amountLimit: 2000,
      status: "inactive",
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe("Updated Budget Name");
    expect(updateRes.data!.amountLimit).toBe(2000);
    expect(updateRes.data!.status).toBe("inactive");

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("DELETE /budgets/:id - delete budget", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-delete-${Date.now()}`,
      note: "delete test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Delete Test Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id as number;

    const deleteRes = await budgetAPI.deleteBudget(budgetId);
    expect(deleteRes.status).toBe(204);

    await accountAPI.deleteAccount(accountId);
  });
});

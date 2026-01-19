import { test, expect } from "@fixtures/index";

test.describe("Budgets - Validation & Error Cases", () => {
  test("POST /budgets - fails without account or category", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.createBudget({
      name: "Invalid Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
      // No accountId or categoryId
    });

    expect(res.status).toBe(400);
  });

  test("POST /budgets - fails with both account and category", async ({
    budgetAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-validation-account-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `e2e-validation-category-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const categoryId = categoryRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      categoryId,
      name: "Invalid Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });

    expect(res.status).toBe(400);

    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - fails without required name field", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-missing-name-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      // name is missing
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    } as any); // Type assertion to bypass TypeScript check

    expect(res.status).toBe(422); // Schema validation error for missing required field

    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - fails with invalid period (end before start)", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-invalid-period-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Invalid Period Budget",
      periodStart: new Date("2026-01-31").toISOString(),
      periodEnd: new Date("2026-01-01").toISOString(), // End before start
      amountLimit: 1000,
    });

    expect(res.status).toBe(400);

    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - fails with zero amount limit", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-zero-amount-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Zero Amount Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 0,
    });

    expect(res.status).toBe(422); // Schema validation error for minimum constraint

    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - fails with negative amount limit", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-negative-amount-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      name: "Negative Amount Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: -100,
    });

    expect(res.status).toBe(422); // Schema validation error for minimum constraint

    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - fails with zero amount limit on update", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-update-zero-amount-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Update Zero Amount Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id as number;

    const updateRes = await budgetAPI.updateBudget(budgetId, {
      amountLimit: 0,
    });

    expect(updateRes.status).toBe(422); // Schema validation error for minimum constraint

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /budgets/:id - returns 404 for non-existent budget", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.getBudget(999999);
    expect(res.status).toBe(404);
  });

  test("PATCH /budgets/:id - returns 404 for non-existent budget", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.updateBudget(999999, {
      name: "Non-existent Budget",
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /budgets/:id - returns 404 for non-existent budget", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.deleteBudget(999999);
    expect(res.status).toBe(404);
  });
});

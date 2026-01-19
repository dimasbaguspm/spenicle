import { test, expect } from "@fixtures/index";

test.describe("Budgets - Status Management & Uniqueness", () => {
  test("POST /budgets - prevents duplicate active budgets for same account/periodType", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-unique-budget-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    // Create first active budget
    const budget1Res = await budgetAPI.createBudget({
      accountId,
      name: "First Monthly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(budget1Res.status).toBe(200);
    const budget1Id = budget1Res.data!.id;

    // Try to create second active budget for same account/periodType - should fail
    const budget2Res = await budgetAPI.createBudget({
      accountId,
      name: "Second Monthly Budget",
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(),
      amountLimit: 1500,
    });
    expect(budget2Res.status).toBe(400);

    await budgetAPI.deleteBudget(budget1Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - allows manual status changes", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-manual-status-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    // Create first active budget (weekly)
    const budget1Res = await budgetAPI.createBudget({
      accountId,
      name: "Weekly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-07").toISOString(), // 7 days = weekly
      amountLimit: 1000,
    });
    const budget1Id = budget1Res.data!.id as number;
    expect(budget1Res.data!.status).toBe("active");

    // Create second budget with different period type (monthly) - should be active by default
    const budget2Res = await budgetAPI.createBudget({
      accountId,
      name: "Monthly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(), // 31 days = monthly
      amountLimit: 1500,
    });
    expect(budget2Res.status).toBe(200);
    const budget2Id = budget2Res.data!.id as number;
    expect(budget2Res.data!.status).toBe("active");

    // Both should be active since they have different period types
    const getBudget1 = await budgetAPI.getBudget(budget1Id);
    expect(getBudget1.data!.status).toBe("active");

    const getBudget2 = await budgetAPI.getBudget(budget2Id);
    expect(getBudget2.data!.status).toBe("active");

    // Manually deactivate the first budget
    const updateBudget1Res = await budgetAPI.updateBudget(budget1Id, {
      status: "inactive",
    });
    expect(updateBudget1Res.status).toBe(200);
    expect(updateBudget1Res.data!.status).toBe("inactive");

    // Second budget should still be active
    const getBudget2Again = await budgetAPI.getBudget(budget2Id);
    expect(getBudget2Again.data!.status).toBe("active");

    await budgetAPI.deleteBudget(budget1Id);
    await budgetAPI.deleteBudget(budget2Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("POST /budgets - allows multiple inactive budgets for same account/periodType", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-multiple-inactive-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    // Create first inactive budget
    const budget1Res = await budgetAPI.createBudget({
      accountId,
      name: "First Inactive Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(budget1Res.status).toBe(200);
    const budget1Id = budget1Res.data!.id;

    // Deactivate it
    await budgetAPI.updateBudget(budget1Id, { status: "inactive" });

    // Create second inactive budget - should succeed
    const budget2Res = await budgetAPI.createBudget({
      accountId,
      name: "Second Inactive Budget",
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(),
      amountLimit: 1500,
    });
    expect(budget2Res.status).toBe(200);
    const budget2Id = budget2Res.data!.id;

    await budgetAPI.deleteBudget(budget2Id);
    await budgetAPI.deleteBudget(budget1Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - prevents activating budget when another active exists for same account/periodType", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-activate-blocked-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const accountId = accountRes.data!.id as number;

    // Create first active budget
    const budget1Res = await budgetAPI.createBudget({
      accountId,
      name: "First Monthly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(budget1Res.status).toBe(200);
    const budget1Id = budget1Res.data!.id;

    // Create second budget with different period type (yearly)
    const budget2Res = await budgetAPI.createBudget({
      accountId,
      name: "Second Yearly Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-12-31").toISOString(), // 366 days = yearly
      amountLimit: 1500,
    });
    expect(budget2Res.status).toBe(200);
    const budget2Id = budget2Res.data!.id;

    // Deactivate the second budget
    await budgetAPI.updateBudget(budget2Id, { status: "inactive" });

    // Change the second budget to have the same period type as the first (monthly)
    const updatePeriodRes = await budgetAPI.updateBudget(budget2Id, {
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(), // 28 days = monthly
    });
    expect(updatePeriodRes.status).toBe(200);

    // Try to activate the second budget - should fail because first is active and same period type
    const activateRes = await budgetAPI.updateBudget(budget2Id, {
      status: "active",
    });
    expect(activateRes.status).toBe(400);

    await budgetAPI.deleteBudget(budget1Id);
    await budgetAPI.deleteBudget(budget2Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("PATCH /budgets/:id - cannot change account or category", async ({
    budgetAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const account1Res = await accountAPI.createAccount({
      name: `e2e-immutable-account1-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const account1Id = account1Res.data!.id as number;

    const account2Res = await accountAPI.createAccount({
      name: `e2e-immutable-account2-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const account2Id = account2Res.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `e2e-immutable-category-${Date.now()}`,
      type: "expense",
      note: "test",
    });
    const categoryId = categoryRes.data!.id as number;

    // Create budget for account1
    const budgetRes = await budgetAPI.createBudget({
      accountId: account1Id,
      name: "Immutable Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id;

    // Verify initial state
    expect(budgetRes.data!.accountId).toBe(account1Id);
    expect(budgetRes.data!.categoryId).toBeUndefined();

    // Try to update account and category - these should be ignored
    const updateRes = await budgetAPI.updateBudget(budgetId, {
      name: "Updated Name",
      // Note: accountId and categoryId are not in UpdateBudgetModel anymore
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe("Updated Name");
    expect(updateRes.data!.accountId).toBe(account1Id); // Should remain unchanged
    expect(updateRes.data!.categoryId).toBeUndefined(); // Should remain unchanged

    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(account2Id);
    await accountAPI.deleteAccount(account1Id);
  });
});

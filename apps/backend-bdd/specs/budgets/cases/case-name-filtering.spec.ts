import { test, expect } from "@fixtures/index";

test.describe("Budgets - Name Filtering & Search", () => {
  test("GET /budgets - filter by exact name match", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const timestamp = Date.now();
    const accountRes = await accountAPI.createAccount({
      name: `e2e-name-filter-${timestamp}`,
      type: "expense",
      note: "filter test",
    });
    const accountId = accountRes.data!.id as number;

    // Create budgets with unique names
    const uniqueName1 = `Groceries Budget ${timestamp}`;
    const budget1Res = await budgetAPI.createBudget({
      accountId,
      name: uniqueName1,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 500,
    });
    const budget1Id = budget1Res.data!.id;

    const uniqueName2 = `Entertainment Budget ${timestamp}`;
    const budget2Res = await budgetAPI.createBudget({
      accountId,
      name: uniqueName2,
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-07").toISOString(), // 7 days = weekly
      amountLimit: 300,
    });
    const budget2Id = budget2Res.data!.id;

    // Filter by exact name
    const filterRes = await budgetAPI.getBudgets({
      name: uniqueName1,
    });

    expect(filterRes.status).toBe(200);
    const items = filterRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.map((b) => b.id)).toContain(budget1Id);

    // Verify the specific budget
    const foundBudget = items.find((b) => b.id === budget1Id);
    expect(foundBudget).toBeDefined();
    expect(foundBudget!.name).toBe(uniqueName1);

    await budgetAPI.deleteBudget(budget2Id);
    await budgetAPI.deleteBudget(budget1Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /budgets - filter by partial name match", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const timestamp = Date.now();
    const accountRes = await accountAPI.createAccount({
      name: `e2e-partial-name-${timestamp}`,
      type: "expense",
      note: "filter test",
    });
    const accountId = accountRes.data!.id as number;

    // Create budgets with similar unique names
    const uniquePrefix = `Test${timestamp}`;
    const budget1Res = await budgetAPI.createBudget({
      accountId,
      name: `${uniquePrefix} Monthly Groceries`,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 500,
    });
    const budget1Id = budget1Res.data!.id;

    const budget2Res = await budgetAPI.createBudget({
      accountId,
      name: `${uniquePrefix} Weekly Groceries`,
      periodStart: new Date("2026-01-08").toISOString(),
      periodEnd: new Date("2026-01-14").toISOString(),
      amountLimit: 150,
    });
    const budget2Id = budget2Res.data!.id;

    const budget3Res = await budgetAPI.createBudget({
      accountId,
      name: `${uniquePrefix} Entertainment Budget`,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-12-31").toISOString(), // 1 year = yearly
      amountLimit: 300,
    });
    const budget3Id = budget3Res.data!.id;

    // Filter by partial match using the unique prefix
    const filterRes = await budgetAPI.getBudgets({
      name: uniquePrefix,
    });

    expect(filterRes.status).toBe(200);
    const items = filterRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.map((b) => b.id)).toEqual(
      expect.arrayContaining([budget1Id, budget2Id, budget3Id]),
    );

    // Verify the budgets contain the expected names
    const budgetNames = items.map((b) => b.name);
    expect(budgetNames).toEqual(
      expect.arrayContaining([
        `${uniquePrefix} Monthly Groceries`,
        `${uniquePrefix} Weekly Groceries`,
        `${uniquePrefix} Entertainment Budget`,
      ]),
    );

    await budgetAPI.deleteBudget(budget3Id);
    await budgetAPI.deleteBudget(budget2Id);
    await budgetAPI.deleteBudget(budget1Id);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /budgets - case insensitive name search", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const timestamp = Date.now();
    const accountRes = await accountAPI.createAccount({
      name: `e2e-case-insensitive-${timestamp}`,
      type: "expense",
      note: "filter test",
    });
    const accountId = accountRes.data!.id as number;

    const uniqueName = `Monthly Expenses Budget ${timestamp}`;
    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: uniqueName,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const budgetId = budgetRes.data!.id;

    // Search with different case
    const searchRes = await budgetAPI.getBudgets({
      name: `monthly expenses budget ${timestamp}`,
    });

    expect(searchRes.status).toBe(200);
    const items = searchRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.map((b) => b.id)).toContain(budgetId);

    // Verify the specific budget
    const foundBudget = items.find((b) => b.id === budgetId);
    expect(foundBudget).toBeDefined();
    expect(foundBudget!.name).toBe(uniqueName);

    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /budgets - combine name filter with other filters", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const timestamp = Date.now();
    const accountRes = await accountAPI.createAccount({
      name: `e2e-combined-filters-${timestamp}`,
      type: "expense",
      note: "filter test",
    });
    const accountId = accountRes.data!.id as number;

    // Create active budget
    const activeName = `Active Monthly Budget ${timestamp}`;
    const activeBudgetRes = await budgetAPI.createBudget({
      accountId,
      name: activeName,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const activeBudgetId = activeBudgetRes.data!.id;

    // Create inactive budget with similar name
    const inactiveName = `Inactive Monthly Budget ${timestamp}`;
    const inactiveBudgetRes = await budgetAPI.createBudget({
      accountId,
      name: inactiveName,
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-07").toISOString(), // 7 days = weekly
      amountLimit: 800,
    });
    const inactiveBudgetId = inactiveBudgetRes.data!.id;

    // Deactivate the second budget
    await budgetAPI.updateBudget(inactiveBudgetId, { status: "inactive" });

    // Filter by name AND status
    const filterRes = await budgetAPI.getBudgets({
      name: `Monthly Budget ${timestamp}`,
      status: "active",
    });

    expect(filterRes.status).toBe(200);
    const items = filterRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.map((b) => b.id)).toContain(activeBudgetId);

    // Verify the specific budget
    const foundBudget = items.find((b) => b.id === activeBudgetId);
    expect(foundBudget).toBeDefined();
    expect(foundBudget!.name).toBe(activeName);
    expect(foundBudget!.status).toBe("active");

    await budgetAPI.deleteBudget(inactiveBudgetId);
    await budgetAPI.deleteBudget(activeBudgetId);
    await accountAPI.deleteAccount(accountId);
  });
});

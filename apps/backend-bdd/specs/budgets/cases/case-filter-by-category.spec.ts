import { test, expect } from "@fixtures/index";

test.describe("Budgets - Filter by Category Cases", () => {
  test("GET /budgets - filter by categoryId returns only budgets for that category", async ({
    budgetAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create account and categories
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-filter-cat-account-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const cat1Res = await categoryAPI.createCategory({
      name: `e2e-budget-filter-cat1-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const cat1Id = cat1Res.data!.id as number;

    const cat2Res = await categoryAPI.createCategory({
      name: `e2e-budget-filter-cat2-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const cat2Id = cat2Res.data!.id as number;

    // Create budgets for each category
    const b1Res = await budgetAPI.createBudget({
      categoryId: cat1Id,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const b1Id = b1Res.data!.id as number;

    const b2Res = await budgetAPI.createBudget({
      categoryId: cat2Id,
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(),
      amountLimit: 2000,
    });
    const b2Id = b2Res.data!.id as number;

    // Filter by cat1Id
    const filteredRes = await budgetAPI.getBudgets({ categoryId: [cat1Id] });
    expect(filteredRes.status).toBeGreaterThanOrEqual(200);
    const items = filteredRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((item: any) => item.categoryId === cat1Id)).toBe(true);

    // Cleanup
    await budgetAPI.deleteBudget(b1Id);
    await budgetAPI.deleteBudget(b2Id);
    await categoryAPI.deleteCategory(cat1Id);
    await categoryAPI.deleteCategory(cat2Id);
    await accountAPI.deleteAccount(accountId);
  });
});

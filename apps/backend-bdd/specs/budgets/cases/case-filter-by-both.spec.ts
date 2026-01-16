import { test, expect } from "@fixtures/index";

test.describe("Budgets - Filter by Both Account and Category Cases", () => {
  test("GET /budgets - filter by both accountId and categoryId returns matching budgets", async ({
    budgetAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create accounts and categories
    const acc1Res = await accountAPI.createAccount({
      name: `e2e-budget-filter-both-acc1-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const acc1Id = acc1Res.data!.id as number;

    const acc2Res = await accountAPI.createAccount({
      name: `e2e-budget-filter-both-acc2-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const acc2Id = acc2Res.data!.id as number;

    const cat1Res = await categoryAPI.createCategory({
      name: `e2e-budget-filter-both-cat1-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const cat1Id = cat1Res.data!.id as number;

    const cat2Res = await categoryAPI.createCategory({
      name: `e2e-budget-filter-both-cat2-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const cat2Id = cat2Res.data!.id as number;

    // Create budgets with different combinations
    const b1Res = await budgetAPI.createBudget({
      accountId: acc1Id,
      categoryId: cat1Id,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const b1Id = b1Res.data!.id as number;

    const b2Res = await budgetAPI.createBudget({
      accountId: acc1Id,
      categoryId: cat2Id,
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(),
      amountLimit: 2000,
    });
    const b2Id = b2Res.data!.id as number;

    const b3Res = await budgetAPI.createBudget({
      accountId: acc2Id,
      categoryId: cat1Id,
      periodStart: new Date("2026-03-01").toISOString(),
      periodEnd: new Date("2026-03-31").toISOString(),
      amountLimit: 3000,
    });
    const b3Id = b3Res.data!.id as number;

    // Filter by acc1Id and cat1Id (should return only b1)
    const filteredRes = await budgetAPI.getBudgets({
      accountId: [acc1Id],
      categoryId: [cat1Id],
    });
    expect(filteredRes.status).toBeGreaterThanOrEqual(200);
    const items = filteredRes.data!.items || [];
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(b1Id);
    expect(items[0].accountId).toBe(acc1Id);
    expect(items[0].categoryId).toBe(cat1Id);

    // Cleanup
    await budgetAPI.deleteBudget(b1Id);
    await budgetAPI.deleteBudget(b2Id);
    await budgetAPI.deleteBudget(b3Id);
    await categoryAPI.deleteCategory(cat1Id);
    await categoryAPI.deleteCategory(cat2Id);
    await accountAPI.deleteAccount(acc1Id);
    await accountAPI.deleteAccount(acc2Id);
  });
});

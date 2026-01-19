import { test, expect } from "@fixtures/index";

test.describe("Budgets - Filter by Account and Category Cases", () => {
  test("GET /budgets - filter by accountId and categoryId separately", async ({
    budgetAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create accounts and categories
    const acc1Res = await accountAPI.createAccount({
      name: `e2e-budget-filter-acc1-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const acc1Id = acc1Res.data!.id as number;

    const acc2Res = await accountAPI.createAccount({
      name: `e2e-budget-filter-acc2-${Date.now()}`,
      note: "filter test",
      type: "expense",
    });
    const acc2Id = acc2Res.data!.id as number;

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

    // Create separate budgets for accounts and categories
    const b1Res = await budgetAPI.createBudget({
      accountId: acc1Id,
      name: "Account 1 Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const b1Id = b1Res.data!.id as number;

    const b2Res = await budgetAPI.createBudget({
      accountId: acc1Id,
      name: "Account 1 Budget 2",
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-07").toISOString(), // 7 days = weekly
      amountLimit: 2000,
    });
    const b2Id = b2Res.data!.id as number;

    const b3Res = await budgetAPI.createBudget({
      categoryId: cat1Id,
      name: "Category 1 Budget",
      periodStart: new Date("2026-03-01").toISOString(),
      periodEnd: new Date("2026-03-31").toISOString(),
      amountLimit: 1500,
    });
    const b3Id = b3Res.data!.id as number;

    // Filter by accountId
    const accountFilterRes = await budgetAPI.getBudgets({
      accountId: [acc1Id],
    });
    expect(accountFilterRes.status).toBe(200);
    const accountBudgets = accountFilterRes.data!.items || [];
    expect(accountBudgets.length).toBeGreaterThanOrEqual(2);
    expect(accountBudgets.map((b) => b.id)).toEqual(
      expect.arrayContaining([b1Id, b2Id]),
    );

    // Verify the specific budgets have correct properties
    const budget1 = accountBudgets.find((b) => b.id === b1Id);
    expect(budget1).toBeDefined();
    expect(budget1!.name).toBe("Account 1 Budget");
    expect(budget1!.periodType).toBe("monthly");

    const budget2 = accountBudgets.find((b) => b.id === b2Id);
    expect(budget2).toBeDefined();
    expect(budget2!.name).toBe("Account 1 Budget 2");
    expect(budget2!.periodType).toBe("weekly");

    // Filter by categoryId
    const categoryFilterRes = await budgetAPI.getBudgets({
      categoryId: [cat1Id],
    });
    expect(categoryFilterRes.status).toBe(200);
    const categoryBudgets = categoryFilterRes.data!.items || [];
    expect(categoryBudgets.length).toBeGreaterThanOrEqual(1);
    expect(categoryBudgets.map((b) => b.id)).toContain(b3Id);

    // Verify the specific category budget has correct properties
    const budget3 = categoryBudgets.find((b) => b.id === b3Id);
    expect(budget3).toBeDefined();
    expect(budget3!.name).toBe("Category 1 Budget");
    expect(budget3!.periodType).toBe("monthly");

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

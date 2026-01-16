import { test, expect } from "@fixtures/index";

test.describe("Budgets - Create Category Only Cases", () => {
  test("POST /budgets - create budget with categoryId only succeeds", async ({
    budgetAPI,
    categoryAPI,
  }) => {
    const categoryRes = await categoryAPI.createCategory({
      name: `e2e-budget-category-only-${Date.now()}`,
      note: "category only test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      categoryId,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data).toBeDefined();
    expect(res.data!.categoryId).toBe(categoryId);
    expect(res.data!.accountId).toBeUndefined();

    const budgetId = res.data!.id as number;
    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

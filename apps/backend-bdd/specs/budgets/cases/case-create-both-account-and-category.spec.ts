import { test, expect } from "@fixtures/index";

test.describe("Budgets - Create Both Account and Category Cases", () => {
  test("POST /budgets - create budget with both accountId and categoryId succeeds", async ({
    budgetAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-both-account-${Date.now()}`,
      note: "both test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const categoryRes = await categoryAPI.createCategory({
      name: `e2e-budget-both-category-${Date.now()}`,
      note: "both test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    const res = await budgetAPI.createBudget({
      accountId,
      categoryId,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.accountId).toBe(accountId);
    expect(res.data!.categoryId).toBe(categoryId);

    const budgetId = res.data!.id as number;
    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

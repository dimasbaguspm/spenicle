import { test, expect } from "@fixtures/index";

test.describe("Budgets - Create Both Account and Category Cases", () => {
  test("POST /budgets - fails with both accountId and categoryId", async ({
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
      name: "Both Account and Category Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBe(400); // Business logic prevents both account and category
    expect(res.error?.detail).toContain("cannot be associated with both");

    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

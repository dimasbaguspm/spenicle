import { test, expect } from "@fixtures/index";

test.describe("Budgets - Create with Invalid Category Cases", () => {
  test("POST /budgets - create budget with invalid categoryId returns error", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.createBudget({
      categoryId: 999999,
      name: "Invalid Category Budget",
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

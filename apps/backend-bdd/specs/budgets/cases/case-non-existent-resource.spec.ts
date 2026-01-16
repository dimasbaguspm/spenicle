import { test, expect } from "@fixtures/index";

test.describe("Budgets - Non-existent Resource Cases", () => {
  test("GET /budgets/:id - get non-existent budget returns error", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.getBudget(999999);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("PATCH /budgets/:id - update non-existent budget returns error", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.updateBudget(999999, {
      amountLimit: 2000,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /budgets/:id - delete non-existent budget returns error", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.deleteBudget(999999);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

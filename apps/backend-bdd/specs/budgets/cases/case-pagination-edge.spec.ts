import { test, expect } from "@fixtures/index";

test.describe("Budgets - Pagination Edge Cases", () => {
  test("GET /budgets - large page number returns empty results", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.getBudgets({
      pageNumber: 999999,
      pageSize: 10,
    });
    expect(res.status).toBe(200);
    const items = res.data!.items || [];
    expect(items.length).toBe(0);
  });

  test("GET /budgets - page size at maximum limit works", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.getBudgets({
      pageNumber: 1,
      pageSize: 100, // Maximum page size from OpenAPI
    });
    expect(res.status).toBe(200);
    const items = res.data!.items || [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(100);
  });

  test("GET /budgets - page size over maximum returns error", async ({
    budgetAPI,
  }) => {
    const res = await budgetAPI.getBudgets({
      pageNumber: 1,
      pageSize: 101, // Over maximum
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

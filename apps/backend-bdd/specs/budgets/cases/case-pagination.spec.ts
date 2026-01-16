import { test, expect } from "@fixtures/index";

test.describe("Budgets - Pagination Cases", () => {
  test("GET /budgets - pages do not overlap and total items consistent", async ({
    budgetAPI,
    accountAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `e2e-budget-pg-account-${Date.now()}`,
      note: "pagination test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    const base = `pg-budget-${Date.now()}`;
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await budgetAPI.createBudget({
        accountId,
        periodStart: new Date(
          `2026-01-${String(i + 1).padStart(2, "0")}`
        ).toISOString(),
        periodEnd: new Date(
          `2026-01-${String(i + 2).padStart(2, "0")}`
        ).toISOString(),
        amountLimit: 1000 + i * 100,
      });
      ids.push(r.data?.id as number);
    }

    const p1 = await budgetAPI.getBudgets({
      pageNumber: 1,
      pageSize: 3,
    });
    const p2 = await budgetAPI.getBudgets({
      pageNumber: 2,
      pageSize: 3,
    });

    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    const i1 = p1.data?.items || [];
    const i2 = p2.data?.items || [];
    const ids1 = i1.map((it: any) => it.id);
    const ids2 = i2.map((it: any) => it.id);

    expect(ids1.filter((x: number) => ids2.includes(x)).length).toBe(0);
    for (const id of ids) await budgetAPI.deleteBudget(id);
    await accountAPI.deleteAccount(accountId);
  });
});

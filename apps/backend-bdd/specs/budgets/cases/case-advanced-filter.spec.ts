import { test, expect } from "@fixtures/index";

test.describe("Budgets - Advanced Filter Cases", () => {
  test("GET /budgets - filter by single accountId returns only budgets for that account", async ({
    budgetAPI,
    accountAPI,
  }) => {
    // Create two accounts
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

    // Create budgets for each
    const b1Res = await budgetAPI.createBudget({
      accountId: acc1Id,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const b1Id = b1Res.data!.id as number;

    const b2Res = await budgetAPI.createBudget({
      accountId: acc2Id,
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(),
      amountLimit: 2000,
    });
    const b2Id = b2Res.data!.id as number;

    // Filter by single acc1Id
    const filteredRes = await budgetAPI.getBudgets({ accountId: [acc1Id] });
    expect(filteredRes.status).toBe(200);
    const items = filteredRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((item: any) => item.accountId === acc1Id)).toBe(true);

    // Cleanup
    await budgetAPI.deleteBudget(b1Id);
    await budgetAPI.deleteBudget(b2Id);
    await accountAPI.deleteAccount(acc1Id);
    await accountAPI.deleteAccount(acc2Id);
  });

  test("GET /budgets - filter by multiple accountIds returns budgets for those accounts", async ({
    budgetAPI,
    accountAPI,
  }) => {
    // Create two accounts
    const acc1Res = await accountAPI.createAccount({
      name: `e2e-budget-multi-acc1-${Date.now()}`,
      note: "multi filter test",
      type: "expense",
    });
    const acc1Id = acc1Res.data!.id as number;

    const acc2Res = await accountAPI.createAccount({
      name: `e2e-budget-multi-acc2-${Date.now()}`,
      note: "multi filter test",
      type: "expense",
    });
    const acc2Id = acc2Res.data!.id as number;

    // Create budgets for each
    const b1Res = await budgetAPI.createBudget({
      accountId: acc1Id,
      periodStart: new Date("2026-01-01").toISOString(),
      periodEnd: new Date("2026-01-31").toISOString(),
      amountLimit: 1000,
    });
    const b1Id = b1Res.data!.id as number;

    const b2Res = await budgetAPI.createBudget({
      accountId: acc2Id,
      periodStart: new Date("2026-02-01").toISOString(),
      periodEnd: new Date("2026-02-28").toISOString(),
      amountLimit: 2000,
    });
    const b2Id = b2Res.data!.id as number;

    // Filter by multiple accountIds
    const filteredRes = await budgetAPI.getBudgets({
      accountId: [acc1Id, acc2Id],
    });
    expect(filteredRes.status).toBe(200);
    const items = filteredRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(2);
    const returnedAccountIds = items.map((item: any) => item.accountId);
    expect(returnedAccountIds).toContain(acc1Id);
    expect(returnedAccountIds).toContain(acc2Id);

    // Cleanup
    await budgetAPI.deleteBudget(b1Id);
    await budgetAPI.deleteBudget(b2Id);
    await accountAPI.deleteAccount(acc1Id);
    await accountAPI.deleteAccount(acc2Id);
  });

  test("GET /budgets - filter by templateId returns budgets from that template", async ({
    budgetAPI,
  }) => {
    // Note: This test assumes budgets can be created with templateId
    // If templateId is not supported in creation, this test may need adjustment
    const res = await budgetAPI.getBudgets({
      templateId: [1], // Assuming template ID 1 exists
    });
    expect(res.status).toBe(200);
    // This is more of a smoke test since we don't have template creation in scope
  });
});

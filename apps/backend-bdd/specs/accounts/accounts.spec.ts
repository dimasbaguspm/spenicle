import { test, expect } from "@fixtures/index";

test.describe("Accounts - Common CRUD", () => {
  test("POST /accounts - create account", async ({ accountAPI }) => {
    const name = `e2e-account-create-${Date.now()}`;
    const res = await accountAPI.createAccount({
      name,
      note: "create test",
      type: "expense",
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    const id = res.data!.id as number;

    await accountAPI.deleteAccount(id);
  });

  test("GET /accounts - list accounts returns items", async ({
    accountAPI,
  }) => {
    const name = `e2e-account-list-${Date.now()}`;
    const created = await accountAPI.createAccount({
      name,
      note: "list test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const listRes = await accountAPI.getAccounts();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);

    await accountAPI.deleteAccount(id);
  });

  test("GET /accounts - list accounts includes embedded budgets", async ({
    accountAPI,
    budgetAPI,
  }) => {
    const accountName = `e2e-account-list-budget-${Date.now()}`;
    const accountRes = await accountAPI.createAccount({
      name: accountName,
      note: "list with budget test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;

    // Create active budget
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "List Budget",
      periodStart: startOfMonth.toISOString(),
      periodEnd: endOfMonth.toISOString(),
      amountLimit: 500,
    });
    const budgetId = budgetRes.data!.id;

    const listRes = await accountAPI.getAccounts();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    const accountWithBudget = items.find((item) => item.id === accountId);
    expect(accountWithBudget).toBeDefined();
    expect(accountWithBudget!.budget).toBeDefined();
    expect(accountWithBudget!.budget!.id).toBe(budgetId);

    // Clean up
    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts/:id - get account by id", async ({ accountAPI }) => {
    const name = `e2e-account-get-${Date.now()}`;
    const created = await accountAPI.createAccount({
      name,
      note: "get test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const getRes = await accountAPI.getAccount(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);

    await accountAPI.deleteAccount(id);
  });

  test("PATCH /accounts/:id - update account", async ({ accountAPI }) => {
    const name = `e2e-account-update-${Date.now()}`;
    const created = await accountAPI.createAccount({
      name,
      note: "update test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const newName = name + "-patched";
    const updateRes = await accountAPI.updateAccount(id, {
      name: newName,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe(newName);

    await accountAPI.deleteAccount(id);
  });

  test("DELETE /accounts/:id - delete account", async ({ accountAPI }) => {
    const name = `e2e-account-delete-${Date.now()}`;
    const created = await accountAPI.createAccount({
      name,
      note: "delete test",
      type: "expense",
    });

    const delRes = await accountAPI.deleteAccount(created.data?.id as number);
    expect([200, 204]).toContain(delRes.status);

    const afterGet = await accountAPI.getAccount(created.data?.id as number);
    expect(afterGet.status).not.toBe(200);
  });

  test("GET /accounts/:id - account with active budget includes embedded budget", async ({
    accountAPI,
    budgetAPI,
  }) => {
    const name = `e2e-account-embedded-budget-${Date.now()}`;
    const accountRes = await accountAPI.createAccount({
      name,
      note: "embedded budget test",
      type: "expense",
    });
    expect(accountRes.status).toBe(200);
    const accountId = accountRes.data!.id as number;

    // Initially, no embedded budget
    const initialGet = await accountAPI.getAccount(accountId);
    expect(initialGet.status).toBe(200);
    expect(initialGet.data!.budget).toBeUndefined();

    // Create an active budget for today
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const budgetRes = await budgetAPI.createBudget({
      accountId,
      name: "Active Budget",
      periodStart: startOfMonth.toISOString(),
      periodEnd: endOfMonth.toISOString(),
      amountLimit: 1000,
    });
    expect(budgetRes.status).toBe(200);
    const budgetId = budgetRes.data!.id;

    // Now get account again, should have embedded budget
    const withBudgetGet = await accountAPI.getAccount(accountId);
    expect(withBudgetGet.status).toBe(200);
    expect(withBudgetGet.data!.budget).toBeDefined();
    expect(withBudgetGet.data!.budget!.id).toBe(budgetId);
    expect(withBudgetGet.data!.budget!.name).toBe("Active Budget");
    expect(withBudgetGet.data!.budget!.amountLimit).toBe(1000);

    // Clean up
    await budgetAPI.deleteBudget(budgetId);
    await accountAPI.deleteAccount(accountId);
  });
});

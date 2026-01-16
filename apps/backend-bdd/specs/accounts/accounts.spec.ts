import { test, expect } from "@fixtures/index";

test.describe("Accounts - Common CRUD", () => {
  test("POST /accounts - create account", async ({ accountAPI }) => {
    const name = `e2e-account-create-${Date.now()}`;
    const res = await accountAPI.createAccount({
      name,
      note: "create test",
      type: "expense",
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
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
    expect(listRes.status).toBeGreaterThanOrEqual(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);

    await accountAPI.deleteAccount(id);
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
    expect(getRes.status).toBeGreaterThanOrEqual(200);
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
    expect(updateRes.status).toBeGreaterThanOrEqual(200);
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
});

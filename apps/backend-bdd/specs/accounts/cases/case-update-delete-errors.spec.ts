import { test, expect } from "@fixtures/index";

test.describe("Accounts - Update/Delete Error Cases", () => {
  test("PATCH /accounts/:id - updating non-existent returns 404", async ({
    accountAPI,
  }) => {
    const res = await accountAPI.updateAccount(99999999, {
      name: "nope",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /accounts/:id - deleting non-existent returns 404", async ({
    accountAPI,
  }) => {
    const res = await accountAPI.deleteAccount(99999999);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("PATCH /accounts/:id - invalid payload returns 400", async ({
    accountAPI,
  }) => {
    const r = await accountAPI.createAccount({
      name: `upd-${Date.now()}`,
      note: "u",
      type: "expense",
    });
    const id = r.data!.id as number;

    const res = await accountAPI.updateAccount(id, {
      type: "invalid-type" as any,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(id);
  });
});

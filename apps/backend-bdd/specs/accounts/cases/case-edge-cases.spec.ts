import { test, expect } from "@fixtures/index";

test.describe("Accounts - Cases", () => {
  test("Edge cases: invalid create and update non-existent", async ({
    accountAPI,
  }) => {
    const badCreate = await accountAPI.createAccount({
      name: "",
      note: "bad",
      type: "expense",
    });
    expect(badCreate.status).toBeGreaterThanOrEqual(400);

    const fakeId = 999999999;
    const updateRes = await accountAPI.updateAccount(fakeId, {
      name: "nope",
      type: "expense",
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);

    const valid = await accountAPI.createAccount({
      name: `edge-${Date.now()}`,
      note: "edge",
      type: "expense",
    });
    expect(valid.status).toBeGreaterThanOrEqual(200);
    const id = valid.data?.id as number;

    const badUpdate = await accountAPI.updateAccount(id, { name: "" });
    expect(badUpdate.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(id);
  });
});

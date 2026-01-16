import { test, expect } from "@fixtures/index";

test.describe("Accounts - Special Characters", () => {
  test("POST /accounts - unicode and special chars in name", async ({
    accountAPI,
  }) => {
    const names = [
      `uni-Ω-${Date.now()}`,
      `emoji-😊-${Date.now()}`,
      `special-!@#$%^&*()-_${Date.now()}`,
    ];
    const ids: number[] = [];
    for (const n of names) {
      const r = await accountAPI.createAccount({
        name: n,
        note: "s",
        type: "expense",
      });
      ids.push(r.data?.id as number);
    }

    const res = await accountAPI.getAccounts({ name: `uni-` });
    expect(res.status).toBe(200);

    for (const id of ids) await accountAPI.deleteAccount(id);
  });
});

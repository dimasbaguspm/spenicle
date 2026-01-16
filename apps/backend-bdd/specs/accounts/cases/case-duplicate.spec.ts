import { test, expect } from "@fixtures/index";

test.describe("Accounts - Duplicate Name Cases", () => {
  test("POST /accounts - creating duplicate names allowed and both exist", async ({
    accountAPI,
  }) => {
    const base = `dup-${Date.now()}`;
    const r1 = await accountAPI.createAccount({
      name: base,
      note: "d1",
      type: "expense",
    });
    const r2 = await accountAPI.createAccount({
      name: base,
      note: "d2",
      type: "expense",
    });
    const id1 = r1.data?.id as number;
    const id2 = r2.data?.id as number;

    const res = await accountAPI.getAccounts({ search: base } as any);
    expect(res.status).toBe(200);
    const items = (res.data as any).items || [];
    const matches = items.filter((it: any) => it.name === base);
    expect(matches.length).toBeGreaterThanOrEqual(2);

    await accountAPI.deleteAccount(id1);
    await accountAPI.deleteAccount(id2);
  });
});

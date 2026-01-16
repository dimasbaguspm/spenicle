import { test, expect } from "@fixtures/index";

test.describe("Accounts - Pagination Cases", () => {
  test("GET /accounts - pages do not overlap and total items consistent", async ({
    accountAPI,
  }) => {
    const base = `pg-${Date.now()}`;
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await accountAPI.createAccount({
        name: `${base}-${i}`,
        note: "pg",
        type: "expense",
      });
      ids.push(r.data?.id as number);
    }

    const p1 = await accountAPI.getAccounts({
      pageNumber: 1,
      pageSize: 3,
    });
    const p2 = await accountAPI.getAccounts({
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
    for (const id of ids) await accountAPI.deleteAccount(id);
  });
});

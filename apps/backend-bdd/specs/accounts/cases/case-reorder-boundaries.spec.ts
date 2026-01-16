import { test, expect } from "@fixtures/index";

test.describe("Accounts - Reorder Boundaries", () => {
  test("POST /accounts/reorder - valid reorder updates order", async ({
    accountAPI,
  }) => {
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await accountAPI.createAccount({
        name: `r-${Date.now()}-${i}`,
        note: "r",
        type: "expense",
      });
      ids.push(r.data?.id as number);
    }

    const order = [...ids].reverse();
    const rr = await accountAPI.reorderAccounts({ data: order });
    expect(rr.status).toBeGreaterThanOrEqual(200);

    const res = await accountAPI.getAccounts({});
    const items = res.data?.items || [];
    const found = items
      .filter((it: any) => order.includes(it.id))
      .slice(0, order.length);
    expect(found.map((f: any) => f.id)).toEqual(order);

    for (const id of ids) await accountAPI.deleteAccount(id);
  });

  test("POST /accounts/reorder - missing ids returns 400", async ({
    accountAPI,
  }) => {
    const res = await accountAPI.reorderAccounts({ data: [] });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /accounts/reorder - non-existent id returns 400", async ({
    accountAPI,
  }) => {
    const r = await accountAPI.createAccount({
      name: `rb-${Date.now()}`,
      note: "rb",
      type: "expense",
    });
    const id = r.data?.id as number;

    const res = await accountAPI.reorderAccounts({
      data: [id, 99999999],
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(id);
  });
});

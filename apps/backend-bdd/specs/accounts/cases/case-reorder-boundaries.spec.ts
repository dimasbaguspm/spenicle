import { test, expect } from "@fixtures/index";

test.describe("Accounts - Reorder Boundaries", () => {
  test("POST /accounts/reorder - valid reorder updates order", async ({
    accountAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for reordering test
    await ensureCleanDB();
    // Create 3 new accounts
    const newIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await accountAPI.createAccount({
        name: `r-${Date.now()}-${i}`,
        note: "r",
        type: "expense",
      });
      newIds.push(r.data?.id as number);
    }

    // Get all accounts (including the new ones and any existing ones)
    const allAccounts = await accountAPI.getAccounts({
      pageSize: 100,
      pageNumber: 1,
    });
    const allIds = allAccounts.data?.items?.map((acc: any) => acc.id) || [];

    // Create new order: reverse the new accounts, keep other accounts at the end
    const newOrder = [...newIds].reverse();
    const otherIds = allIds.filter((id) => !newIds.includes(id));
    const order = [...newOrder, ...otherIds];

    const rr = await accountAPI.reorderAccounts({ data: order });
    expect(rr.status).toBe(204);

    const res = await accountAPI.getAccounts({});
    const items = res.data?.items || [];
    const found = items
      .filter((it: any) => newOrder.includes(it.id))
      .slice(0, newOrder.length);
    expect(found.map((f: any) => f.id)).toEqual(newOrder);

    for (const id of newIds) await accountAPI.deleteAccount(id);
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

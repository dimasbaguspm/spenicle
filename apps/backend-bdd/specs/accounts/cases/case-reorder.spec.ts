import { test, expect } from "@fixtures/index";

test.describe("Accounts - Cases", () => {
  test("POST /accounts/reorder - reorder accounts preserves requested order", async ({
    accountAPI,
  }) => {
    const accs = [] as number[];

    for (let i = 0; i < 3; i++) {
      const r = await accountAPI.createAccount({
        name: `reorder-${Date.now()}-${i}`,
        note: "reorder test",
        type: "expense",
      });
      expect(r.status).toBeGreaterThanOrEqual(200);
      accs.push(r.data!.id as number);
    }

    const newOrder = [...accs].reverse();

    // Retrieve full active account list so we can provide a complete id array
    const fullListRes = await accountAPI.getAccounts({ pageSize: 100 });
    expect(fullListRes.status).toBeGreaterThanOrEqual(200);
    const fullIds = (fullListRes.data!.items || []).map(
      (it: any) => it.id as number
    );

    // Build a full reorder payload where only our created ids are reordered
    const createdSet = new Set(accs);
    const rev = [...accs].reverse();
    let ri = 0;
    const newOrderFull = fullIds.map((id: number) => {
      if (createdSet.has(id)) {
        return rev[ri++];
      }
      return id;
    });

    const reorderRes = await accountAPI.reorderAccounts({ data: newOrderFull });
    expect([200, 204]).toContain(reorderRes.status);

    const listRes = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(listRes.status).toBeGreaterThanOrEqual(200);
    const items = listRes.data!.items || [];
    // Find positions of our created ids in returned items
    const positions = newOrder.map((id) =>
      items.findIndex((it) => it.id === id)
    );
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);

    for (const id of accs) await accountAPI.deleteAccount(id);
  });
});

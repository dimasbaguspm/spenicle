import { test, expect } from "@fixtures/index";

test.describe("Accounts - Cases", () => {
  test("DELETE /accounts/:id affects ordering compactly", async ({
    accountAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for reordering test
    await ensureCleanDB();
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await accountAPI.createAccount({
        name: `delete-order-${Date.now()}-${i}`,
        note: "delete order test",
        type: "expense",
      });
      expect(r.status).toBe(200);
      ids.push(r.data!.id as number);
    }

    const list1 = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(list1.status).toBe(200);
    const items1 = list1.data!.items || [];
    const positions1 = ids.map((id) =>
      items1.findIndex((it: any) => it.id === id)
    );

    const mid = ids[1];
    const del = await accountAPI.deleteAccount(mid);
    expect([200, 204]).toContain(del.status);

    const list2 = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(list2.status).toBe(200);
    const items2 = list2.data!.items || [];
    const remaining = [ids[0], ids[2]];
    const positions2 = remaining.map((id) =>
      items2.findIndex((it: any) => it.id === id)
    );
    expect(positions2[0]).toBeGreaterThanOrEqual(0);
    expect(positions2[1]).toBeGreaterThanOrEqual(0);

    expect(positions2[0]).toBeLessThan(positions2[1]);
    expect(Math.abs(positions2[0] - positions2[1])).toBe(1);

    for (const id of remaining) {
      await accountAPI.deleteAccount(id);
    }
  });
  test("DELETE /accounts/:id - delete middle compacts order", async ({
    accountAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for reordering test
    await ensureCleanDB();
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await accountAPI.createAccount({
        name: `delete-order-${Date.now()}-${i}`,
        note: "delete order test",
        type: "expense",
      });
      expect(r.status).toBe(200);
      ids.push(r.data!.id as number);
    }

    const mid = ids[1];
    const del = await accountAPI.deleteAccount(mid);
    expect([200, 204]).toContain(del.status);

    const list2 = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(list2.status).toBe(200);
    const items2 = list2.data!.items || [];
    const remaining = [ids[0], ids[2]];
    const positions2 = remaining.map((id) =>
      items2.findIndex((it: any) => it.id === id)
    );
    expect(positions2[0]).toBeLessThan(positions2[1]);

    for (const id of remaining) await accountAPI.deleteAccount(id);
  });

  test("DELETE /accounts/:id - delete first keeps relative order", async ({
    accountAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for reordering test
    await ensureCleanDB();
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await accountAPI.createAccount({
        name: `delete-first-${Date.now()}-${i}`,
        note: "delete first",
        type: "expense",
      });
      ids.push(r.data!.id as number);
    }
    const first = ids[0];
    await accountAPI.deleteAccount(first);

    const list = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    const items = list.data!.items || [];
    const positions = [ids[1], ids[2]].map((id) =>
      items.findIndex((it: any) => it.id === id)
    );
    expect(positions[0]).toBeLessThan(positions[1]);

    for (const id of [ids[1], ids[2]]) await accountAPI.deleteAccount(id);
  });

  test("DELETE /accounts/:id - delete single account leaves none", async ({
    accountAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for reordering test
    await ensureCleanDB();
    const r = await accountAPI.createAccount({
      name: `delete-single-${Date.now()}`,
      note: "single",
      type: "expense",
    });
    const id = r.data!.id as number;
    const del = await accountAPI.deleteAccount(id);
    expect([200, 204]).toContain(del.status);

    const list = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    const items = list.data!.items || [];
    const exists = items.some((it: any) => it.id === id);
    expect(exists).toBe(false);
  });
});

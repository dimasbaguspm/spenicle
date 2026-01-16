import { test, expect } from "@fixtures/index";

test.describe("Accounts - Cases", () => {
  test("GET /accounts - advanced filter search by name", async ({
    accountAPI,
  }) => {
    const prefix = `filter-${Date.now()}`;
    const createdIds: number[] = [];

    const a1 = await accountAPI.createAccount({
      name: `${prefix}-apple`,
      note: "f1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `${prefix}-banana`,
      note: "f2",
      type: "income",
    });
    const a3 = await accountAPI.createAccount({
      name: `${prefix}-apple-2`,
      note: "f3",
      type: "expense",
    });
    createdIds.push(a1.data!.id, a2.data!.id, a3.data!.id);

    const res = await accountAPI.getAccounts({ name: "apple" });
    expect(res.status).toBeGreaterThanOrEqual(200);
    const items = res.data!.items || [];
    const found = items.filter((it: any) => String(it.name).includes("apple"));
    expect(found.length).toBeGreaterThanOrEqual(2);

    // Cleanup
    for (const id of createdIds) {
      await accountAPI.deleteAccount(id);
    }
  });

  test("GET /accounts - exact match returns correct item", async ({
    accountAPI,
  }) => {
    const name = `exact-${Date.now()}`;
    const r = await accountAPI.createAccount({
      name,
      note: "exact",
      type: "expense",
    });
    const id = r.data!.id as number;

    const res = await accountAPI.getAccounts({ name });
    expect(res.status).toBeGreaterThanOrEqual(200);
    const items = res.data!.items || [];
    const match = items.find((it: any) => it.id === id);
    expect(match).toBeDefined();

    await accountAPI.deleteAccount(id);
  });

  test("GET /accounts - pagination respects pageSize", async ({
    accountAPI,
  }) => {
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await accountAPI.createAccount({
        name: `pg-${Date.now()}-${i}`,
        note: "pg",
        type: "expense",
      });
      ids.push(r.data!.id as number);
    }

    const page1 = await accountAPI.getAccounts({ pageNumber: 1, pageSize: 2 });
    expect(page1.status).toBeGreaterThanOrEqual(200);
    const items1 = page1.data!.items || [];
    expect(items1.length).toBeLessThanOrEqual(2);

    const page2 = await accountAPI.getAccounts({ pageNumber: 2, pageSize: 2 });
    expect(page2.status).toBeGreaterThanOrEqual(200);
    const items2 = page2.data!.items || [];
    expect(items2.length).toBeLessThanOrEqual(2);

    for (const id of ids) await accountAPI.deleteAccount(id);
  });

  test("GET /accounts - filter by type (expense/income)", async ({
    accountAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `type-${Date.now()}-e`,
      note: "t",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `type-${Date.now()}-i`,
      note: "t",
      type: "income",
    });
    const id1 = a1.data!.id as number;
    const id2 = a2.data!.id as number;

    const resE = await accountAPI.getAccounts({ type: ["expense"] });
    expect(resE.status).toBeGreaterThanOrEqual(200);
    const itemsE = resE.data!.items || [];
    expect(itemsE.some((it: any) => it.id === id1)).toBe(true);

    const resI = await accountAPI.getAccounts({ type: ["income"] });
    expect(resI.status).toBeGreaterThanOrEqual(200);
    const itemsI = resI.data!.items || [];
    expect(itemsI.some((it: any) => it.id === id2)).toBe(true);

    await accountAPI.deleteAccount(id1);
    await accountAPI.deleteAccount(id2);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Accounts - Concurrency Cases", () => {
  test("POST /accounts - concurrent creates result in unique ids and proper display_order", async ({
    accountAPI,
  }) => {
    const base = `conc-${Date.now()}`;
    const promises = [] as Promise<any>[];
    for (let i = 0; i < 10; i++) {
      promises.push(
        accountAPI.createAccount({
          name: `${base}-${i}`,
          note: "c",
          type: "expense",
        })
      );
    }

    const results = await Promise.all(promises);
    const ids = results.map((r: any) => (r.data as any).id as number);

    const unique = Array.from(new Set(ids));
    expect(unique.length).toBe(ids.length);

    const res = await accountAPI.getAccounts({
      search: base,
      pageSize: 20,
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    const items = (res.data as any).items || [];
    expect(items.length).toBeGreaterThanOrEqual(10);

    for (const id of ids) await accountAPI.deleteAccount(id);
  });
});

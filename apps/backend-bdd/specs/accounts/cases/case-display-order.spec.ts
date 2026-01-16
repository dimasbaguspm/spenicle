import { test, expect } from "@fixtures/index";

test.describe("Accounts - Display Order After Deletes", () => {
  test("DELETE /accounts - deleting middle compacts display_order", async ({
    accountAPI,
  }) => {
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await accountAPI.createAccount({
        name: `do-${Date.now()}-${i}`,
        note: "do",
        type: "expense",
      });
      ids.push(r.data?.id as number);
    }

    await accountAPI.deleteAccount(ids[1]);

    const res = await accountAPI.getAccounts({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(res.status).toBe(200);
    const items = (res.data as any).items || [];
    const remaining = items
      .filter((it: any) => ids.slice(0, 4).includes(it.id))
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

    if (remaining.length > 0) {
      const base = remaining[0].displayOrder;
      for (let i = 0; i < remaining.length; i++) {
        expect(remaining[i].displayOrder).toBe(base + i);
      }
    }

    for (const id of ids) {
      try {
        await accountAPI.deleteAccount(id);
      } catch (e) {
        /* ignore */
      }
    }
  });
});

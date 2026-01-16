import { test, expect } from "@fixtures/index";

test.describe("Categories - Reorder Boundaries", () => {
  test("POST /categories/reorder - valid reorder updates order", async ({
    categoryAPI,
  }) => {
    const accs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await categoryAPI.createCategory({
        name: `rb-${Date.now()}-${i}`,
        note: "r",
        type: "expense",
      } as any);
      accs.push(r.data!.id as number);
    }

    const full = await categoryAPI.getCategories({ pageSize: 100 });
    const fullIds = (full.data!.items || []).map((it) => it.id as number);

    const createdSet = new Set(accs);
    const rev = [...accs].reverse();
    let ri = 0;
    const payload = fullIds.map((id: number) =>
      createdSet.has(id) ? rev[ri++] : id
    );

    const res = await categoryAPI.reorderCategories({ items: payload });
    expect([200, 204]).toContain(res.status);

    for (const id of accs) await categoryAPI.deleteCategory(id);
  });

  test("POST /categories/reorder - missing ids returns 400", async ({
    categoryAPI,
  }) => {
    const res = await categoryAPI.reorderCategories({ items: [] });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /categories/reorder - non-existent id returns 400", async ({
    categoryAPI,
  }) => {
    const full = await categoryAPI.getCategories({ pageSize: 100 });
    const fullIds = (full.data!.items || []).map((it) => it.id as number);
    fullIds[0] = 999999999;
    const res = await categoryAPI.reorderCategories({ items: fullIds });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

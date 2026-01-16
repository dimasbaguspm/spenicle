import { test, expect } from "@fixtures/index";

test.describe("Categories - Display Order After Deletes", () => {
  test("DELETE /categories - deleting middle compacts display_order", async ({
    categoryAPI,
  }) => {
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await categoryAPI.createCategory({
        name: `do-${Date.now()}-${i}`,
        note: "do",
        type: "expense",
      });
      ids.push(r.data?.id as number);
    }

    await categoryAPI.deleteCategory(ids[1]);

    const res = await categoryAPI.getCategories({
      sortBy: "displayOrder",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(res.status).toBe(200);
    const items = res.data?.items || [];
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
        await categoryAPI.deleteCategory(id);
      } catch (e) {
        /* ignore */
      }
    }
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Categories - Cases", () => {
  test("GET /categories - advanced filter search by name", async ({
    categoryAPI,
  }) => {
    const res = await categoryAPI.getCategories({ name: "apple" });
    expect(res.status).toBe(200);
  });

  test("GET /categories - exact match returns correct item", async ({
    categoryAPI,
  }) => {
    const name = `exact-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "f",
      type: "expense",
    });
    const res = await categoryAPI.getCategories({ name });
    expect(res.status).toBe(200);
    const items = res.data!.items || [];
    expect(items.some((it) => it.id === created.data!.id)).toBe(true);
    await categoryAPI.deleteCategory(created.data!.id as number);
  });

  test("GET /categories - pagination respects pageSize", async ({
    categoryAPI,
  }) => {
    const p1 = await categoryAPI.getCategories({ pageNumber: 1, pageSize: 1 });
    const p2 = await categoryAPI.getCategories({ pageNumber: 2, pageSize: 1 });
    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    const items1 = p1.data!.items || [];
    const items2 = p2.data!.items || [];
    // Items should not overlap
    const ids1 = new Set(items1.map((it) => it.id));
    for (const it of items2) expect(ids1.has(it.id)).toBe(false);
  });

  test("GET /categories - filter by type", async ({ categoryAPI }) => {
    const resE = await categoryAPI.getCategories({ type: ["expense"] });
    const resI = await categoryAPI.getCategories({ type: ["income"] });
    expect(resE.status).toBe(200);
    expect(resI.status).toBe(200);
  });
});

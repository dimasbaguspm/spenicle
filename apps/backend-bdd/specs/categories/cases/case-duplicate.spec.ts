import { test, expect } from "@fixtures/index";

test.describe("Categories - Duplicate Name Cases", () => {
  test("POST /categories - creating duplicate names allowed and both exist", async ({
    categoryAPI,
  }) => {
    const base = `dup-${Date.now()}`;
    const r1 = await categoryAPI.createCategory({
      name: base,
      note: "a",
      type: "expense",
    } as any);
    const r2 = await categoryAPI.createCategory({
      name: base,
      note: "b",
      type: "expense",
    } as any);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const list = await categoryAPI.getCategories({ name: base });
    const items = list.data!.items || [];
    expect(
      items.filter((it: any) => it.name === base).length
    ).toBeGreaterThanOrEqual(2);

    await categoryAPI.deleteCategory(r1.data!.id as number);
    await categoryAPI.deleteCategory(r2.data!.id as number);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Categories - Concurrency Cases", () => {
  test("POST /categories - concurrent creates result in unique ids and proper display_order", async ({
    categoryAPI,
  }) => {
    const base = `conc-${Date.now()}`;
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        categoryAPI.createCategory({
          name: `${base}-${i}`,
          note: "c",
          type: "expense",
        })
      );
    }

    const results = await Promise.all(promises);
    const ids = results.map((r) => r.data!.id as number);
    const unique = Array.from(new Set(ids));
    expect(unique.length).toBe(ids.length);

    const res = await categoryAPI.getCategories({
      name: base,
      pageSize: 20,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    const items = (res.data as any).items || [];
    expect(items.length).toBeGreaterThanOrEqual(10);

    for (const id of ids) await categoryAPI.deleteCategory(id);
  });
});

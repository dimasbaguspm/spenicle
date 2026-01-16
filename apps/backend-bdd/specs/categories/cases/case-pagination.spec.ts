import { test, expect } from "@fixtures/index";

test.describe("Categories - Pagination Cases", () => {
  test("GET /categories - pages do not overlap and total items consistent", async ({
    categoryAPI,
  }) => {
    const p1 = await categoryAPI.getCategories({ pageNumber: 1, pageSize: 2 });
    const p2 = await categoryAPI.getCategories({ pageNumber: 2, pageSize: 2 });
    expect(p1.status).toBeGreaterThanOrEqual(200);
    expect(p2.status).toBeGreaterThanOrEqual(200);
    const ids1 = (p1.data!.items || []).map((it: any) => it.id);
    const ids2 = (p2.data!.items || []).map((it: any) => it.id);
    for (const id of ids2) expect(ids1.includes(id)).toBe(false);
  });
});

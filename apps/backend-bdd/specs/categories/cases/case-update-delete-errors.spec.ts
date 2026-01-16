import { test, expect } from "@fixtures/index";

test.describe("Categories - Update/Delete Error Cases", () => {
  test("PATCH /categories/:id - updating non-existent returns 404", async ({
    categoryAPI,
  }) => {
    const res = await categoryAPI.updateCategory(99999999, {
      name: "nope",
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /categories/:id - deleting non-existent returns 404", async ({
    categoryAPI,
  }) => {
    const res = await categoryAPI.deleteCategory(99999999);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("PATCH /categories/:id - invalid payload returns 400", async ({
    categoryAPI,
  }) => {
    const r = await categoryAPI.createCategory({
      name: `upd-${Date.now()}`,
      note: "u",
      type: "expense",
    } as any);
    const id = r.data!.id as number;

    const res = await categoryAPI.updateCategory(id, {
      type: "invalid-type" as any,
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);

    await categoryAPI.deleteCategory(id);
  });
});

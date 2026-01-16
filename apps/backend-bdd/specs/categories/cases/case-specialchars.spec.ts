import { test, expect } from "@fixtures/index";

test.describe("Categories - Special Characters", () => {
  test("POST /categories - unicode and special chars in name", async ({
    categoryAPI,
  }) => {
    const name = `uni-✓-©-${Date.now()}`;
    const r = await categoryAPI.createCategory({
      name,
      note: "u",
      type: "expense",
    } as any);
    expect(r.status).toBe(200);
    await categoryAPI.deleteCategory(r.data!.id as number);
  });
});

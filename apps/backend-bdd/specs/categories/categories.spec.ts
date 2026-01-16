import { test, expect } from "@fixtures/index";

test.describe("Categories - Common CRUD", () => {
  test("POST /categories - create category", async ({ categoryAPI }) => {
    const name = `e2e-category-create-${Date.now()}`;
    const res = await categoryAPI.createCategory({
      name,
      note: "create test",
      type: "expense",
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data).toBeDefined();
    const id = res.data!.id as number;

    await categoryAPI.deleteCategory(id);
  });

  test("GET /categories - list categories returns items", async ({
    categoryAPI,
  }) => {
    const name = `e2e-category-list-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "list test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const listRes = await categoryAPI.getCategories();
    expect(listRes.status).toBeGreaterThanOrEqual(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);

    await categoryAPI.deleteCategory(id);
  });

  test("GET /categories/:id - get category by id", async ({ categoryAPI }) => {
    const name = `e2e-category-get-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "get test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const getRes = await categoryAPI.getCategory(id);
    expect(getRes.status).toBeGreaterThanOrEqual(200);
    expect(getRes.data!.id).toBe(id);

    await categoryAPI.deleteCategory(id);
  });

  test("PATCH /categories/:id - update category", async ({ categoryAPI }) => {
    const name = `e2e-category-update-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "update test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const newName = name + "-patched";
    const updateRes = await categoryAPI.updateCategory(id, {
      name: newName,
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(200);
    expect(updateRes.data!.name).toBe(newName);

    await categoryAPI.deleteCategory(id);
  });

  test("DELETE /categories/:id - delete category", async ({ categoryAPI }) => {
    const name = `e2e-category-delete-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "delete test",
      type: "expense",
    });

    const delRes = await categoryAPI.deleteCategory(created.data?.id as number);
    expect([200, 204]).toContain(delRes.status);

    const afterGet = await categoryAPI.getCategory(created.data?.id as number);
    expect(afterGet.status).not.toBe(200);
  });
});

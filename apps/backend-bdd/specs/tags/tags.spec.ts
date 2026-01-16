import { test, expect } from "@fixtures/index";

test.describe("Tags - Common CRUD", () => {
  test("POST /tags - create tag", async ({ tagAPI }) => {
    const name = `e2e-tag-create-${Date.now()}`;
    const res = await tagAPI.createTag({
      name,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.data).toBeDefined();
    const id = res.data!.id as number;

    await tagAPI.deleteTag(id);
  });

  test("GET /tags - list tags returns items", async ({ tagAPI }) => {
    const name = `e2e-tag-list-${Date.now()}`;
    const created = await tagAPI.createTag({
      name,
    });
    const id = created.data!.id as number;

    const listRes = await tagAPI.getTags();
    expect(listRes.status).toBeGreaterThanOrEqual(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);

    await tagAPI.deleteTag(id);
  });

  test("GET /tags/:id - get tag by id", async ({ tagAPI }) => {
    const name = `e2e-tag-get-${Date.now()}`;
    const created = await tagAPI.createTag({
      name,
    });
    const id = created.data!.id as number;

    const getRes = await tagAPI.getTag(id);
    expect(getRes.status).toBeGreaterThanOrEqual(200);
    expect(getRes.data!.id).toBe(id);

    await tagAPI.deleteTag(id);
  });

  test("PATCH /tags/:id - update tag", async ({ tagAPI }) => {
    const name = `e2e-tag-update-${Date.now()}`;
    const created = await tagAPI.createTag({
      name,
    });
    const id = created.data!.id as number;

    const newName = name + "-patched";
    const updateRes = await tagAPI.updateTag(id, {
      name: newName,
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(200);
    expect(updateRes.data!.name).toBe(newName);

    await tagAPI.deleteTag(id);
  });

  test("DELETE /tags/:id - delete tag", async ({ tagAPI }) => {
    const name = `e2e-tag-delete-${Date.now()}`;
    const created = await tagAPI.createTag({
      name,
    });

    const delRes = await tagAPI.deleteTag(created.data?.id as number);
    expect([200, 204]).toContain(delRes.status);

    const afterGet = await tagAPI.getTag(created.data?.id as number);
    expect(afterGet.status).not.toBe(200);
  });
});

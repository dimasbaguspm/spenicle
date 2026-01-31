import { test, expect } from "@fixtures/index";

test.describe("Tags - Update Validation Cases", () => {
  test("PATCH /tags/{id} - update with valid data", async ({ tagAPI }) => {
    // Create a tag
    const created = await tagAPI.createTag({
      name: `update-valid-${Date.now()}`,
    });
    const id = created.data!.id as number;

    // Update it
    const updated = await tagAPI.updateTag(id, {
      name: `updated-${Date.now()}`,
    });
    expect(updated.status).toBe(200);
    expect(updated.data!.name).toBeDefined();

    await tagAPI.deleteTag(id);
  });

  test("PATCH /tags/{id} - update with empty name", async ({ tagAPI }) => {
    // Create a tag
    const created = await tagAPI.createTag({
      name: `update-empty-${Date.now()}`,
    });
    const id = created.data!.id as number;

    // Try to update with empty name
    const updateRes = await tagAPI.updateTag(id, {
      name: "",
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(id);
  });

  test("PATCH /tags/{id} - update with duplicate name", async ({ tagAPI }) => {
    // Create two tags
    const tag1 = await tagAPI.createTag({
      name: `duplicate-update-1-${Date.now()}`,
    });
    const tag2 = await tagAPI.createTag({
      name: `duplicate-update-2-${Date.now()}`,
    });
    const id1 = tag1.data!.id as number;
    const id2 = tag2.data!.id as number;

    // Try to update tag1 to have the same name as tag2
    const updateRes = await tagAPI.updateTag(id1, {
      name: tag2.data!.name,
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(id1);
    await tagAPI.deleteTag(id2);
  });

  test("PATCH /tags/{id} - update non-existent tag", async ({ tagAPI }) => {
    const updateRes = await tagAPI.updateTag(999999, {
      name: "non-existent-update",
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);
  });
});

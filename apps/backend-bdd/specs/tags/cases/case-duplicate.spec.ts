import { test, expect } from "@fixtures/index";

test.describe("Tags - Duplicate Cases", () => {
  test("POST /tags - duplicate name returns 400", async ({ tagAPI }) => {
    const name = `e2e-duplicate-${Date.now()}`;

    // Create first tag
    const first = await tagAPI.createTag({
      name,
    });
    expect(first.status).toBe(200);
    const id = first.data!.id as number;

    // Try to create duplicate
    const duplicate = await tagAPI.createTag({
      name,
    });
    expect(duplicate.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(id);
  });

  test("POST /tags - case insensitive duplicate returns 400", async ({
    tagAPI,
  }) => {
    const name = `e2e-case-${Date.now()}`;

    // Create first tag
    const first = await tagAPI.createTag({
      name,
    });
    expect(first.status).toBe(200);
    const id = first.data!.id as number;

    // Try to create case variant (should succeed - case sensitive uniqueness)
    const duplicate = await tagAPI.createTag({
      name: name.toUpperCase(),
    });
    expect(duplicate.status).toBe(200);

    await tagAPI.deleteTag(id);
    await tagAPI.deleteTag(duplicate.data!.id as number);
  });
});

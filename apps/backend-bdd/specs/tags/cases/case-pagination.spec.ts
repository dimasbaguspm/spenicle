import { test, expect } from "@fixtures/index";

test.describe("Tags - Pagination Cases", () => {
  test("GET /tags - pagination works", async ({ tagAPI }) => {
    // Create multiple tags
    const createdIds: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await tagAPI.createTag({
        name: `pagination-tag-${Date.now()}-${i}`,
      });
      createdIds.push(res.data!.id as number);
    }

    // Test pagination
    const page1 = await tagAPI.getTags({ pageNumber: 1, pageSize: 2 });
    expect(page1.status).toBe(200);
    expect(page1.data!.items!.length).toBeLessThanOrEqual(2);

    const page2 = await tagAPI.getTags({ pageNumber: 2, pageSize: 2 });
    expect(page2.status).toBe(200);
    expect(page2.data!.items!.length).toBeLessThanOrEqual(2);

    // Cleanup
    for (const id of createdIds) {
      await tagAPI.deleteTag(id);
    }
  });

  test("GET /tags - page size limits", async ({ tagAPI }) => {
    // Test maximum page size
    const maxPage = await tagAPI.getTags({ pageSize: 100 });
    expect(maxPage.status).toBe(200);

    // Test page size over limit
    const overLimit = await tagAPI.getTags({ pageSize: 101 });
    expect(overLimit.status).toBeGreaterThanOrEqual(400);
  });

  test("GET /tags - search by name", async ({ tagAPI }) => {
    const uniqueName = `search-test-${Date.now()}`;

    // Create a tag
    const created = await tagAPI.createTag({
      name: uniqueName,
    });
    const id = created.data!.id as number;

    // Search for it
    const searchRes = await tagAPI.getTags({ name: uniqueName });
    expect(searchRes.status).toBe(200);
    expect(searchRes.data!.items!.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.data!.items!.some((tag) => tag.name === uniqueName)).toBe(
      true
    );

    // Search for non-existent
    const noMatch = await tagAPI.getTags({ name: "non-existent-tag-12345" });
    expect(noMatch.status).toBe(200);
    expect(noMatch.data!.items!.length).toBe(0);

    await tagAPI.deleteTag(id);
  });
});

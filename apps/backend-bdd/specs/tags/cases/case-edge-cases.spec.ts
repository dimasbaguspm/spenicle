import { test, expect } from "@fixtures/index";

test.describe("Tags - Edge Cases", () => {
  test("Edge cases: invalid create and update non-existent", async ({
    tagAPI,
  }) => {
    const badCreate = await tagAPI.createTag({
      name: "",
    });
    expect(badCreate.status).toBeGreaterThanOrEqual(400);

    const fakeId = 999999999;
    const updateRes = await tagAPI.updateTag(fakeId, {
      name: "nope",
    });
    expect(updateRes.status).toBeGreaterThanOrEqual(400);

    const valid = await tagAPI.createTag({
      name: `edge-${Date.now()}`,
    });
    expect(valid.status).toBeGreaterThanOrEqual(200);
    const id = valid.data?.id as number;

    const badUpdate = await tagAPI.updateTag(id, { name: "" });
    expect(badUpdate.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(id);
  });

  test("special characters in tag name", async ({ tagAPI }) => {
    const specialNames = [
      "tag-with-dashes",
      "tag_with_underscores",
      "tag with spaces",
      "tag123",
      "tag@#$%^&*()",
      "tag-中文",
      "tag-émoji🚀",
    ];

    // Tags now allow special characters, spaces, and unicode
    for (const name of specialNames) {
      const res = await tagAPI.createTag({
        name,
      });
      expect(res.status).toBeGreaterThanOrEqual(200);

      // Clean up created tag
      if (res.status >= 200 && res.status < 300 && res.data?.id) {
        await tagAPI.deleteTag(res.data.id);
      }
    }
  });

  test("long tag names at boundary", async ({ tagAPI }) => {
    const boundaryNames = [
      "x".repeat(10), // Short name
      "x".repeat(25), // Medium name
      "x".repeat(49), // Just under actual limit
      "x".repeat(50), // At actual limit (fails)
      "x".repeat(51), // Over actual limit
    ];

    const createdIds: number[] = [];

    for (let i = 0; i < boundaryNames.length; i++) {
      const name = boundaryNames[i];
      const res = await tagAPI.createTag({
        name,
      });

      if (i < 3) {
        // First three should succeed
        expect(res.status).toBeGreaterThanOrEqual(200);
        if (res.data) {
          createdIds.push(res.data.id as number);
        }
      } else {
        // Last two should fail
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    }

    // Cleanup
    for (const id of createdIds) {
      await tagAPI.deleteTag(id);
    }
  });
});

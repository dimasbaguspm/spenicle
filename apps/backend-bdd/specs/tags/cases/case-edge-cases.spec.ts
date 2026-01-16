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
    expect(valid.status).toBe(200);
    const id = valid.data?.id as number;

    const badUpdate = await tagAPI.updateTag(id, { name: "" });
    expect(badUpdate.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(id);
  });

  test("special characters in tag name", async ({ tagAPI }) => {
    const specialNames = [
      `tag-with-dashes-${Date.now()}`,
      `tag_with_underscores-${Date.now()}`,
      `tag with spaces ${Date.now()}`,
      `tag123-${Date.now()}`,
    ];

    // Test basic special characters that should be allowed
    for (const name of specialNames) {
      const res = await tagAPI.createTag({
        name,
      });
      expect(res.status).toBe(200);

      // Clean up created tag
      if (res.status >= 200 && res.status < 300 && res.data?.id) {
        await tagAPI.deleteTag(res.data.id);
      }
    }
  });

  test("long tag names at boundary", async ({ tagAPI }) => {
    const ts = Date.now();
    const boundaryNames = [
      `short-${ts}`, // Short name
      `medium-name-${ts}-extra`, // Medium name
      `x${ts}`.padEnd(50, "x"), // Exactly at limit (50 chars)
      `x`.repeat(51), // Over limit (51 chars, should fail)
    ];

    const createdIds: number[] = [];

    for (let i = 0; i < boundaryNames.length; i++) {
      const name = boundaryNames[i];
      const res = await tagAPI.createTag({
        name,
      });

      if (i < 3) {
        // First three should succeed
        expect(res.status).toBe(200);
        if (res.data) {
          createdIds.push(res.data.id as number);
        }
      } else {
        // Last one should fail
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    }

    // Cleanup
    for (const id of createdIds) {
      await tagAPI.deleteTag(id);
    }
  });
});

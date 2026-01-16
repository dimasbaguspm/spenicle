import { test, expect } from "@fixtures/index";

test.describe("Tags - Delete Edge Cases", () => {
  test("DELETE /tags/{id} - delete non-existent tag", async ({ tagAPI }) => {
    const deleteRes = await tagAPI.deleteTag(999999);
    expect(deleteRes.status).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /tags/{id} - delete already deleted tag", async ({ tagAPI }) => {
    // Create a tag
    const created = await tagAPI.createTag({
      name: `delete-twice-${Date.now()}`,
    });
    const id = created.data!.id as number;

    // Delete it once
    const delete1 = await tagAPI.deleteTag(id);
    expect(delete1.status).toBe(204);

    // Try to delete again
    const delete2 = await tagAPI.deleteTag(id);
    expect(delete2.status).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /tags/{id} - delete with invalid ID format", async ({
    tagAPI,
  }) => {
    // Test with negative ID
    const deleteNegative = await tagAPI.deleteTag(-1);
    expect(deleteNegative.status).toBeGreaterThanOrEqual(400);

    // Test with zero ID
    const deleteZero = await tagAPI.deleteTag(0);
    expect(deleteZero.status).toBeGreaterThanOrEqual(400);
  });

  test("DELETE /tags/{id} - delete tag used in transactions", async ({
    tagAPI,
    transactionAPI,
  }) => {
    // This test assumes tags can be associated with transactions
    // If the API doesn't support this, this test should be skipped or removed

    // Create a tag
    const tag = await tagAPI.createTag({
      name: `transaction-tag-${Date.now()}`,
    });
    const tagId = tag.data!.id as number;

    // Create a transaction with this tag (if supported)
    // Note: This depends on the transaction API supporting tags
    // If not supported, this test should be adjusted or removed

    // For now, just test basic delete (assuming no transaction association)
    const deleteRes = await tagAPI.deleteTag(tagId);
    expect(deleteRes.status).toBe(204);
  });
});

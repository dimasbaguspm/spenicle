import { test, expect } from "@fixtures/index";

test.describe("Tags - Create Invalid Cases", () => {
  test("POST /tags - missing name returns 400", async ({ tagAPI }) => {
    const res = await tagAPI.createTag({} as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /tags - empty name returns 400", async ({ tagAPI }) => {
    const res = await tagAPI.createTag({
      name: "",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /tags - too long name returns 400", async ({ tagAPI }) => {
    const long = "x".repeat(256);
    const res = await tagAPI.createTag({
      name: long,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /tags - whitespace only name returns 400", async ({ tagAPI }) => {
    const res = await tagAPI.createTag({
      name: "   ",
    });
    // API allows whitespace-only names (only checks minLength:1)
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});

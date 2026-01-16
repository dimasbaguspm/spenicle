import { test, expect } from "@fixtures/index";

test.describe("Categories - Create Invalid Cases", () => {
  test("POST /categories - missing name returns 400", async ({
    categoryAPI,
  }) => {
    const res = await categoryAPI.createCategory({
      name: "",
      note: "x",
      type: "expense",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /categories - too long name returns 400", async ({
    categoryAPI,
  }) => {
    const long = "a".repeat(300);
    const res = await categoryAPI.createCategory({
      name: long,
      note: "x",
      type: "expense",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /categories - invalid type returns 400", async ({
    categoryAPI,
  }) => {
    const res = await categoryAPI.createCategory({
      name: `inv-${Date.now()}`,
      note: "x",
      type: "invalid" as any,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

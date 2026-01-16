import { test, expect } from "@fixtures/index";

test.describe("Accounts - Create Invalid Cases", () => {
  test("POST /accounts - missing name returns 400", async ({ accountAPI }) => {
    const res = await accountAPI.createAccount({ note: "no name" } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /accounts - too long name returns 400", async ({ accountAPI }) => {
    const long = "x".repeat(1025);
    const res = await accountAPI.createAccount({
      name: long,
      note: "too long",
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /accounts - invalid type returns 400", async ({ accountAPI }) => {
    const res = await accountAPI.createAccount({
      name: `inv-${Date.now()}`,
      type: "unknown",
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

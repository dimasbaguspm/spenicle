import { test, expect } from "@fixtures/index";

test.describe("Summary - Invalid Request Cases", () => {
  test("GET /summary/accounts - missing startDate returns 400", async ({
    summaryAPI,
  }) => {
    const res = await summaryAPI.getAccountSummary({
      endDate: new Date().toISOString(),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("GET /summary/accounts - missing endDate returns 400", async ({
    summaryAPI,
  }) => {
    const res = await summaryAPI.getAccountSummary({
      startDate: new Date().toISOString(),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("GET /summary/accounts - invalid date format returns 400", async ({
    summaryAPI,
  }) => {
    const res = await summaryAPI.getAccountSummary({
      startDate: "invalid-date",
      endDate: new Date().toISOString(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("GET /summary/accounts - endDate before startDate returns 400", async ({
    summaryAPI,
  }) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const res = await summaryAPI.getAccountSummary({
      startDate: tomorrow,
      endDate: yesterday,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("GET /summary/categories - invalid date format returns 400", async ({
    summaryAPI,
  }) => {
    const res = await summaryAPI.getCategorySummary({
      startDate: "not-a-date",
      endDate: new Date().toISOString(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("GET /summary/transactions - missing frequency uses default", async ({
    summaryAPI,
  }) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const res = await summaryAPI.getTransactionSummary({
      startDate: yesterday,
      endDate: tomorrow,
    } as any);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data?.frequency).toBe("monthly"); // default frequency
  });

  test("GET /summary/transactions - invalid frequency returns 400", async ({
    summaryAPI,
  }) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const res = await summaryAPI.getTransactionSummary({
      startDate: yesterday,
      endDate: tomorrow,
      frequency: "invalid",
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

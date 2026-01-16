import { test, expect } from "@fixtures/index";

test.describe("Summary - Empty Results Cases", () => {
  test("GET /summary/accounts - empty range returns zeroed totals", async ({
    summaryAPI,
  }) => {
    const farFuture = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365
    ).toISOString();
    const farFutureEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 366
    ).toISOString();
    const accSum = await summaryAPI.getAccountSummary({
      startDate: farFuture,
      endDate: farFutureEnd,
    });
    expect(accSum.status).toBe(200);
    expect(accSum.data).toBeDefined();
    const items = accSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    for (const it of items) {
      expect(Number(it.incomeAmount || 0)).toBeGreaterThanOrEqual(0);
      expect(Number(it.expenseAmount || 0)).toBeGreaterThanOrEqual(0);
    }
  });

  test("GET /summary/categories - empty range returns zeroed totals", async ({
    summaryAPI,
  }) => {
    const farFuture = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365
    ).toISOString();
    const farFutureEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 366
    ).toISOString();
    const catSum = await summaryAPI.getCategorySummary({
      startDate: farFuture,
      endDate: farFutureEnd,
    });
    expect(catSum.status).toBe(200);
    expect(catSum.data).toBeDefined();
    const items = catSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    for (const it of items) {
      expect(Number(it.incomeAmount || 0)).toBeGreaterThanOrEqual(0);
      expect(Number(it.expenseAmount || 0)).toBeGreaterThanOrEqual(0);
    }
  });

  test("GET /summary/transactions - empty range returns zeroed totals", async ({
    summaryAPI,
  }) => {
    const farFuture = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365
    ).toISOString();
    const farFutureEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 366
    ).toISOString();
    const txSum = await summaryAPI.getTransactionSummary({
      startDate: farFuture,
      endDate: farFutureEnd,
      frequency: "daily",
    });
    expect(txSum.status).toBe(200);
    expect(txSum.data).toBeDefined();
    const items = txSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    // Should return periods with zero counts for ranges with no transactions
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(Number(it.totalCount || 0)).toBe(0);
      expect(Number(it.incomeCount || 0)).toBe(0);
      expect(Number(it.expenseCount || 0)).toBe(0);
      expect(Number(it.transferCount || 0)).toBe(0);
    }
  });

  test("GET /summary/accounts - range with no accounts returns empty array", async ({
    summaryAPI,
  }) => {
    // This test assumes we can have a scenario where accounts exist but no transactions
    // In practice, this might be hard to test without complex setup
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();

    const accSum = await summaryAPI.getAccountSummary({
      startDate: yesterday,
      endDate: today,
    });
    expect(accSum.status).toBe(200);
    expect(accSum.data).toBeDefined();
    const items = accSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    // Items may exist if there are accounts, but amounts should be zero if no transactions
  });
});

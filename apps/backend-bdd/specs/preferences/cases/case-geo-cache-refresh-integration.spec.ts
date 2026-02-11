import { test, expect } from "@fixtures/index";

/**
 * Test coordinates around Yogyakarta
 */
const YOGYAKARTA_LOCATIONS = {
  malioboro: { latitude: -7.7979, longitude: 110.3689 },
  tamanPintar: { latitude: -7.7959, longitude: 110.4119 },
};

/**
 * Helper to wait for transaction to appear in geo search results
 * Retries up to maxRetries times with delayMs between attempts
 */
async function waitForGeoIndexed(
  transactionAPI: any,
  txId: number,
  latitude: number,
  longitude: number,
  radiusMeters: number,
  maxRetries: number = 10,
  delayMs: number = 100,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await transactionAPI.getTransactions({
      latitude,
      longitude,
      radiusMeters,
    });

    if (res.status === 200 && res.data?.items) {
      const found = res.data.items.find((tx: any) => tx.id === txId);
      if (found) return true;
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

test.describe("Preferences - Geo Cache Refresh Integration", () => {
  test("refresh-geo-cache with coordinates indexes nearby transactions", async ({
    preferenceAPI,
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Setup: Create account and category
    const acc = await accountAPI.createAccount({
      name: `geo-refresh-acc-${Date.now()}`,
      note: "",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `geo-refresh-cat-${Date.now()}`,
      note: "",
      type: "expense",
    });

    // Create geotagged transaction
    const location = YOGYAKARTA_LOCATIONS.malioboro;
    const txRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id,
      categoryId: cat.data!.id,
      amount: 50000,
      date: new Date().toISOString(),
      type: "expense",
      note: "Test transaction for geo-cache refresh",
      latitude: location.latitude,
      longitude: location.longitude,
    });
    expect(txRes.status).toBe(200);
    const txId = txRes.data!.id;

    // Wait for auto-indexing (transactions are auto-indexed on create)
    const indexed = await waitForGeoIndexed(
      transactionAPI,
      txId,
      location.latitude,
      location.longitude,
      5000,
    );
    expect(indexed).toBe(true);

    // Trigger manual refresh with coordinates
    const refreshRes = await preferenceAPI.refreshGeoCache({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    expect(refreshRes.status).toBe(204);

    // Verify transaction still appears in geo search after refresh
    // (refresh should re-index existing transactions)
    await new Promise((resolve) => setTimeout(resolve, 200)); // Wait for background indexing
    const searchRes = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 5000,
    });
    expect(searchRes.status).toBe(200);
    const foundTx = searchRes.data!.items!.find((tx: any) => tx.id === txId);
    expect(foundTx).toBeDefined();
    expect(foundTx!.latitude).toBe(location.latitude);
    expect(foundTx!.longitude).toBe(location.longitude);

    // Cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id);
    await categoryAPI.deleteCategory(cat.data!.id);
  });

  test("refresh-geo-cache without coordinates still indexes transactions", async ({
    preferenceAPI,
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Setup: Create account and category
    const acc = await accountAPI.createAccount({
      name: `geo-refresh-no-coords-acc-${Date.now()}`,
      type: "expense",
      note: "",
    });
    const cat = await categoryAPI.createCategory({
      name: `geo-refresh-no-coords-cat-${Date.now()}`,
      type: "expense",
      note: "",
    });

    // Create geotagged transaction
    const location = YOGYAKARTA_LOCATIONS.tamanPintar;
    const txRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id,
      categoryId: cat.data!.id,
      amount: 75000,
      date: new Date().toISOString(),
      type: "expense",
      note: "Test transaction without refresh coords",
      latitude: location.latitude,
      longitude: location.longitude,
    });
    expect(txRes.status).toBe(200);
    const txId = txRes.data!.id;

    // Wait for auto-indexing
    const indexed = await waitForGeoIndexed(
      transactionAPI,
      txId,
      location.latitude,
      location.longitude,
      5000,
    );
    expect(indexed).toBe(true);

    // Trigger manual refresh WITHOUT coordinates
    // Backend should fetch most recent 100 geotagged transactions
    const refreshRes = await preferenceAPI.refreshGeoCache();
    expect(refreshRes.status).toBe(204);

    // Verify transaction still appears in geo search
    await new Promise((resolve) => setTimeout(resolve, 200));
    const searchRes = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 5000,
    });
    expect(searchRes.status).toBe(200);
    const foundTx = searchRes.data!.items!.find((tx: any) => tx.id === txId);
    expect(foundTx).toBeDefined();

    // Cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id);
    await categoryAPI.deleteCategory(cat.data!.id);
  });
});

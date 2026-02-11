import { test, expect } from "@fixtures/index";
import type { TransactionAPIClient } from "@fixtures/transaction-client";

/**
 * Yogyakarta test coordinates (distinct locations around the city)
 */
const YOGYAKARTA_LOCATIONS = {
  malioboro: {
    name: "Malioboro Street",
    latitude: -7.7979,
    longitude: 110.3689,
  },
  tamanPintar: {
    name: "Taman Pintar",
    latitude: -7.7959,
    longitude: 110.4119,
  },
  borobudur: {
    name: "Borobudur Area",
    latitude: -7.6076,
    longitude: 110.2038,
  },
  airport: {
    name: "Yogyakarta Airport Area",
    latitude: -7.9201,
    longitude: 110.4316,
  },
};

/**
 * Helper to wait for geo index to be updated with a transaction
 * The backend updates Redis geo index asynchronously, so we retry until found or timeout
 * @param transactionAPI - The transaction API client
 * @param txId - Transaction ID to search for
 * @param latitude - Search latitude
 * @param longitude - Search longitude
 * @param radiusMeters - Search radius
 * @param maxRetries - Max number of retries (default 10)
 * @param delayMs - Delay between retries in ms (default 100)
 */
async function waitForGeoIndexUpdate(
  transactionAPI: TransactionAPIClient,
  txId: number,
  latitude: number,
  longitude: number,
  radiusMeters: number,
  maxRetries: number = 10,
  delayMs: number = 100,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const searchRes = await transactionAPI.getTransactions({
      latitude,
      longitude,
      radiusMeters,
    });

    if (searchRes.status === 200 && searchRes.data?.items) {
      const found = searchRes.data.items.find((tx) => tx.id === txId);
      if (found) {
        return;
      }
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Helper to wait for geo index removal of a transaction
 * @param transactionAPI - The transaction API client
 * @param txId - Transaction ID to wait for removal
 * @param latitude - Search latitude
 * @param longitude - Search longitude
 * @param radiusMeters - Search radius
 * @param maxRetries - Max number of retries (default 10)
 * @param delayMs - Delay between retries in ms (default 100)
 */
async function waitForGeoIndexRemoval(
  transactionAPI: TransactionAPIClient,
  txId: number,
  latitude: number,
  longitude: number,
  radiusMeters: number,
  maxRetries: number = 10,
  delayMs: number = 100,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const searchRes = await transactionAPI.getTransactions({
      latitude,
      longitude,
      radiusMeters,
    });

    if (searchRes.status === 200 && searchRes.data?.items) {
      const found = searchRes.data.items.find((tx) => tx.id === txId);
      if (!found) {
        return;
      }
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

test.describe("Transactions - Geolocation CRUD", () => {
  test("POST /transactions with geolocation - create and search by location", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-acc-${Date.now()}`,
      note: "geo account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-cat-${Date.now()}`,
      note: "geo category",
      type: "expense",
    });

    const location = YOGYAKARTA_LOCATIONS.malioboro;
    const payload = {
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "lunch at malioboro",
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const createRes = await transactionAPI.createTransaction(payload);
    expect(createRes.status).toBe(200);
    expect(createRes.data).toBeDefined();
    const txId = createRes.data!.id as number;

    // Verify transaction was created with coordinates
    const getRes = await transactionAPI.getTransaction(txId);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.latitude).toBe(location.latitude);
    expect(getRes.data!.longitude).toBe(location.longitude);

    // Search by geolocation (1km radius from the exact location)
    const searchRes = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 1000,
    });
    expect(searchRes.status).toBe(200);
    expect(searchRes.data!.items).toBeDefined();
    const foundTx = searchRes.data!.items!.find((tx) => tx.id === txId);
    expect(foundTx).toBeDefined();
    expect(foundTx!.latitude).toBe(location.latitude);
    expect(foundTx!.longitude).toBe(location.longitude);

    // cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("PATCH /transactions - update geolocation coordinates and verify in search", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-update-acc-${Date.now()}`,
      note: "geo update account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-update-cat-${Date.now()}`,
      note: "geo update category",
      type: "expense",
    });

    const initialLocation = YOGYAKARTA_LOCATIONS.malioboro;
    const createPayload = {
      accountId: acc.data!.id as number,
      amount: 100000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "transaction at malioboro",
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
    };

    const createRes = await transactionAPI.createTransaction(createPayload);
    expect(createRes.status).toBe(200);
    const txId = createRes.data!.id as number;

    // Verify found at initial location
    const searchInitial = await transactionAPI.getTransactions({
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
      radiusMeters: 1000,
    });
    expect(searchInitial.status).toBe(200);
    let foundTx = searchInitial.data!.items!.find((tx) => tx.id === txId);
    expect(foundTx).toBeDefined();

    // Update to new location
    const newLocation = YOGYAKARTA_LOCATIONS.tamanPintar;
    const updateRes = await transactionAPI.updateTransaction(txId, {
      note: "transaction at taman pintar",
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.latitude).toBe(newLocation.latitude);
    expect(updateRes.data!.longitude).toBe(newLocation.longitude);

    // Wait for geo index to be updated to new location
    await waitForGeoIndexUpdate(
      transactionAPI,
      txId,
      newLocation.latitude,
      newLocation.longitude,
      1000,
    );

    // Verify found at new location
    const searchNew = await transactionAPI.getTransactions({
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
      radiusMeters: 1000,
    });
    expect(searchNew.status).toBe(200);
    foundTx = searchNew.data!.items!.find((tx) => tx.id === txId);
    expect(foundTx).toBeDefined();
    expect(foundTx!.latitude).toBe(newLocation.latitude);
    expect(foundTx!.longitude).toBe(newLocation.longitude);

    // cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("DELETE /transactions - geolocation removed from index after deletion", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-delete-acc-${Date.now()}`,
      note: "geo delete account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-delete-cat-${Date.now()}`,
      note: "geo delete category",
      type: "expense",
    });

    const location = YOGYAKARTA_LOCATIONS.borobudur;
    const createPayload = {
      accountId: acc.data!.id as number,
      amount: 75000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "borobudur visit",
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const createRes = await transactionAPI.createTransaction(createPayload);
    expect(createRes.status).toBe(200);
    const txId = createRes.data!.id as number;

    // Verify transaction is in geo index
    const searchBefore = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 2000,
    });
    expect(searchBefore.status).toBe(200);
    let foundTx = searchBefore.data!.items!.find((tx) => tx.id === txId);
    expect(foundTx).toBeDefined();

    // Delete transaction
    const deleteRes = await transactionAPI.deleteTransaction(txId);
    expect([200, 204]).toContain(deleteRes.status);

    // Wait for geo index to be updated and transaction removed
    await waitForGeoIndexRemoval(
      transactionAPI,
      txId,
      location.latitude,
      location.longitude,
      2000,
    );

    // Verify transaction is removed from geo index
    const searchAfter = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 2000,
    });
    expect(searchAfter.status).toBe(200);
    foundTx = searchAfter.data!.items!.find((tx) => tx.id === txId);
    expect(foundTx).toBeUndefined();

    // cleanup
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("GET /transactions - radius filtering returns only nearby transactions", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-radius-acc-${Date.now()}`,
      note: "geo radius account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-radius-cat-${Date.now()}`,
      note: "geo radius category",
      type: "expense",
    });

    // Create transactions at 4 different Yogyakarta locations
    const txIds: number[] = [];
    for (const [key, location] of Object.entries(YOGYAKARTA_LOCATIONS)) {
      const createRes = await transactionAPI.createTransaction({
        accountId: acc.data!.id as number,
        amount: 50000,
        categoryId: cat.data!.id as number,
        date: new Date().toISOString(),
        type: "expense" as const,
        note: `transaction at ${location.name}`,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      expect(createRes.status).toBe(200);
      txIds.push(createRes.data!.id as number);

      // Wait for geo index to be populated
      await waitForGeoIndexUpdate(
        transactionAPI,
        createRes.data!.id as number,
        location.latitude,
        location.longitude,
        1000,
      );
    }

    // Search with small radius from Malioboro (should only find nearby Taman Pintar)
    const searchSmall = await transactionAPI.getTransactions({
      latitude: YOGYAKARTA_LOCATIONS.malioboro.latitude,
      longitude: YOGYAKARTA_LOCATIONS.malioboro.longitude,
      radiusMeters: 6000, // ~6km radius, should find Malioboro and Taman Pintar
    });
    expect(searchSmall.status).toBe(200);
    const smallRadiusTxs = searchSmall.data!.items!.filter((tx) =>
      txIds.includes(tx.id as number),
    );
    expect(smallRadiusTxs.length).toBeGreaterThan(0);
    expect(smallRadiusTxs.length).toBeLessThan(4);

    // Search with large radius from Malioboro (should find all 4)
    const searchLarge = await transactionAPI.getTransactions({
      latitude: YOGYAKARTA_LOCATIONS.malioboro.latitude,
      longitude: YOGYAKARTA_LOCATIONS.malioboro.longitude,
      radiusMeters: 50000, // ~50km radius, should find all locations
    });
    expect(searchLarge.status).toBe(200);
    const largeRadiusTxs = searchLarge.data!.items!.filter((tx) =>
      txIds.includes(tx.id as number),
    );
    expect(largeRadiusTxs.length).toBe(4);

    // cleanup
    for (const txId of txIds) {
      await transactionAPI.deleteTransaction(txId);
    }
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("POST /transactions - coordinate validation: both lat/lng must be provided together", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-validation-acc-${Date.now()}`,
      note: "geo validation account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-validation-cat-${Date.now()}`,
      note: "geo validation category",
      type: "expense",
    });

    // Only latitude provided (missing longitude)
    const resLatOnly = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "partial coords",
      latitude: -7.7979,
      longitude: undefined,
    } as any);
    expect(resLatOnly.status).toBeGreaterThanOrEqual(400);

    // Only longitude provided (missing latitude)
    const resLngOnly = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "partial coords",
      latitude: undefined,
      longitude: 110.3689,
    } as any);
    expect(resLngOnly.status).toBeGreaterThanOrEqual(400);

    // cleanup
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("PATCH /transactions - coordinate validation on update", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-validation-update-acc-${Date.now()}`,
      note: "geo validation update account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-validation-update-cat-${Date.now()}`,
      note: "geo validation update category",
      type: "expense",
    });

    // Create a transaction with coordinates
    const location = YOGYAKARTA_LOCATIONS.malioboro;
    const createRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "initial transaction",
      latitude: location.latitude,
      longitude: location.longitude,
    });
    expect(createRes.status).toBe(200);
    const txId = createRes.data!.id as number;

    // Try to update with only latitude (should fail)
    const updateLatOnly = await transactionAPI.updateTransaction(txId, {
      latitude: -7.6076,
      longitude: undefined,
    } as any);
    expect(updateLatOnly.status).toBeGreaterThanOrEqual(400);

    // Try to update with only longitude (should fail)
    const updateLngOnly = await transactionAPI.updateTransaction(txId, {
      latitude: undefined,
      longitude: 110.2038,
    } as any);
    expect(updateLngOnly.status).toBeGreaterThanOrEqual(400);

    // cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("GET /transactions - search without geolocation params returns all transactions", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-mixed-acc-${Date.now()}`,
      note: "geo mixed account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-mixed-cat-${Date.now()}`,
      note: "geo mixed category",
      type: "expense",
    });

    // Create transaction WITH geolocation
    const geoRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "with geo",
      latitude: YOGYAKARTA_LOCATIONS.malioboro.latitude,
      longitude: YOGYAKARTA_LOCATIONS.malioboro.longitude,
    });
    expect(geoRes.status).toBe(200);
    const geoTxId = geoRes.data!.id as number;

    // Create transaction WITHOUT geolocation
    const noGeoRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 30000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "without geo",
    });
    expect(noGeoRes.status).toBe(200);
    const noGeoTxId = noGeoRes.data!.id as number;

    // Search without geo params should return BOTH
    const searchAll = await transactionAPI.getTransactions({
      accountId: [acc.data!.id as number],
    });
    expect(searchAll.status).toBe(200);
    const allTxs = searchAll.data!.items!;
    const foundGeo = allTxs.find((tx) => tx.id === geoTxId);
    const foundNoGeo = allTxs.find((tx) => tx.id === noGeoTxId);
    expect(foundGeo).toBeDefined();
    expect(foundNoGeo).toBeDefined();

    // Search with geo params should return ONLY the geotagged one
    const searchGeo = await transactionAPI.getTransactions({
      latitude: YOGYAKARTA_LOCATIONS.malioboro.latitude,
      longitude: YOGYAKARTA_LOCATIONS.malioboro.longitude,
      radiusMeters: 5000,
    });
    expect(searchGeo.status).toBe(200);
    const geoTxs = searchGeo.data!.items!;
    const geoFound = geoTxs.find((tx) => tx.id === geoTxId);
    const noGeoFound = geoTxs.find((tx) => tx.id === noGeoTxId);
    expect(geoFound).toBeDefined();
    expect(noGeoFound).toBeUndefined();

    // cleanup
    await transactionAPI.deleteTransaction(geoTxId);
    await transactionAPI.deleteTransaction(noGeoTxId);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("POST /transactions - zero coordinates (0,0) do not trigger geolocation search", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-zero-acc-${Date.now()}`,
      note: "geo zero account",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-geo-zero-cat-${Date.now()}`,
      note: "geo zero category",
      type: "expense",
    });

    // Create transaction with zero coordinates - should be treated as no geo
    const createRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
      note: "zero coords",
      latitude: 0,
      longitude: 0,
    });
    expect(createRes.status).toBe(200);
    const txId = createRes.data!.id as number;

    // Searching at a valid location should NOT find this transaction
    const searchRes = await transactionAPI.getTransactions({
      latitude: YOGYAKARTA_LOCATIONS.malioboro.latitude,
      longitude: YOGYAKARTA_LOCATIONS.malioboro.longitude,
      radiusMeters: 50000,
    });
    expect(searchRes.status).toBe(200);
    const foundTx = searchRes.data!.items!.find((tx) => tx.id === txId);
    // Transaction with (0,0) should not be included in geo search
    expect(foundTx).toBeUndefined();

    // cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("GET /transactions - geolocation + categoryId filter returns only matching category", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-filter-acc-${Date.now()}`,
      note: "geo filter account",
      type: "expense",
    });

    // Create two different categories
    const cat1Res = await categoryAPI.createCategory({
      name: `tx-geo-filter-cat1-${Date.now()}`,
      note: "geo filter category 1",
      type: "expense",
    });
    const cat2Res = await categoryAPI.createCategory({
      name: `tx-geo-filter-cat2-${Date.now()}`,
      note: "geo filter category 2",
      type: "expense",
    });
    const cat1Id = cat1Res.data!.id as number;
    const cat2Id = cat2Res.data!.id as number;

    // Create two transactions at same location with different categories
    const location = YOGYAKARTA_LOCATIONS.malioboro;
    const tx1Res = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: cat1Id,
      date: new Date().toISOString(),
      type: "expense",
      note: "transaction 1 - category 1",
      latitude: location.latitude,
      longitude: location.longitude,
    });
    const tx1Id = tx1Res.data!.id as number;

    const tx2Res = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 75000,
      categoryId: cat2Id,
      date: new Date().toISOString(),
      type: "expense",
      note: "transaction 2 - category 2",
      latitude: location.latitude,
      longitude: location.longitude,
    });
    const tx2Id = tx2Res.data!.id as number;

    // Wait for both to be indexed
    await waitForGeoIndexUpdate(
      transactionAPI,
      tx1Id,
      location.latitude,
      location.longitude,
      1000,
    );
    await waitForGeoIndexUpdate(
      transactionAPI,
      tx2Id,
      location.latitude,
      location.longitude,
      1000,
    );

    // Search with geo + cat1 filter - should return only tx1
    const searchCat1 = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 1000,
      categoryId: [cat1Id],
    });
    expect(searchCat1.status).toBe(200);
    expect(searchCat1.data!.items).toHaveLength(1);
    expect(searchCat1.data!.items![0].id).toBe(tx1Id);
    expect(searchCat1.data!.items![0].category.id).toBe(cat1Id);

    // Search with geo + cat2 filter - should return only tx2
    const searchCat2 = await transactionAPI.getTransactions({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 1000,
      categoryId: [cat2Id],
    });
    expect(searchCat2.status).toBe(200);
    expect(searchCat2.data!.items).toHaveLength(1);
    expect(searchCat2.data!.items![0].id).toBe(tx2Id);
    expect(searchCat2.data!.items![0].category.id).toBe(cat2Id);

    // cleanup
    await transactionAPI.deleteTransaction(tx1Id);
    await transactionAPI.deleteTransaction(tx2Id);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat1Id);
    await categoryAPI.deleteCategory(cat2Id);
  });

  test("GET /transactions - no geolocation results + categoryId filter returns nothing", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-geo-empty-acc-${Date.now()}`,
      note: "geo empty account",
      type: "expense",
    });

    const cat = await categoryAPI.createCategory({
      name: `tx-geo-empty-cat-${Date.now()}`,
      note: "geo empty category",
      type: "expense",
    });
    const catId = cat.data!.id as number;

    // Create a transaction at location A (Malioboro)
    const locationA = YOGYAKARTA_LOCATIONS.malioboro;
    const txRes = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50000,
      categoryId: catId,
      date: new Date().toISOString(),
      type: "expense",
      note: "transaction at malioboro",
      latitude: locationA.latitude,
      longitude: locationA.longitude,
    });
    const txId = txRes.data!.id as number;

    // Wait for geo index
    await waitForGeoIndexUpdate(
      transactionAPI,
      txId,
      locationA.latitude,
      locationA.longitude,
      1000,
    );

    // Search at location B (Borobudur - far away) with categoryId filter
    // Should return empty because geo search returns no results, so category filter returns nothing
    const locationB = YOGYAKARTA_LOCATIONS.borobudur;
    const searchEmpty = await transactionAPI.getTransactions({
      latitude: locationB.latitude,
      longitude: locationB.longitude,
      radiusMeters: 1000,
      categoryId: [catId],
    });
    expect(searchEmpty.status).toBe(200);
    expect(searchEmpty.data!.items).toHaveLength(0);

    // cleanup
    await transactionAPI.deleteTransaction(txId);
    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(catId);
  });
});

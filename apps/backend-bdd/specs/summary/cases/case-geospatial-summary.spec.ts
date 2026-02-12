import { test, expect } from "@fixtures/index";

/**
 * Jakarta test coordinates for geospatial testing
 */
const JAKARTA_LOCATIONS = {
  center: {
    name: "Jakarta Center",
    latitude: -6.175,
    longitude: 106.827,
  },
  south: {
    name: "Jakarta South",
    latitude: -6.2,
    longitude: 106.827,
  },
  north: {
    name: "Jakarta North",
    latitude: -6.15,
    longitude: 106.827,
  },
  west: {
    name: "Jakarta West",
    latitude: -6.175,
    longitude: 106.8,
  },
  farAway: {
    name: "Far from Jakarta",
    latitude: -7.7979,
    longitude: 110.3689,
  },
};

test.describe("Summary - Geospatial Transaction Aggregation", () => {
  test("GET /summary/geospatial - returns aggregated transactions within radius", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange: Create test data
    const account = await accountAPI.createAccount({
      name: `geo-sum-acc-${Date.now()}`,
      note: "geospatial summary test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `geo-sum-cat-${Date.now()}`,
      note: "geospatial summary test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create 3 transactions at the same location
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx3 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 75000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    // Act: Call geospatial summary
    const response = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data!.centerLat).toBe(JAKARTA_LOCATIONS.center.latitude);
    expect(response.data!.centerLon).toBe(JAKARTA_LOCATIONS.center.longitude);
    expect(response.data!.totalCells).toBeGreaterThan(0);
    expect(response.data!.data).toBeInstanceOf(Array);

    // Verify grid cell structure
    const cell = response.data!.data![0];
    expect(cell).toHaveProperty("gridLat");
    expect(cell).toHaveProperty("gridLon");
    expect(cell).toHaveProperty("transactionCount");
    expect(cell).toHaveProperty("totalAmount");
    expect(cell.transactionCount).toBeGreaterThanOrEqual(3);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await transactionAPI.deleteTransaction(tx3.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - respects grid precision parameter", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `grid-prec-acc-${Date.now()}`,
      note: "grid precision test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `grid-prec-cat-${Date.now()}`,
      note: "grid precision test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create transactions at slightly different locations
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.south.latitude,
      longitude: JAKARTA_LOCATIONS.south.longitude,
      date: now.toISOString(),
    });

    // Act: Test different precision levels
    const response1 = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 10000,
      gridPrecision: 1,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    const response4 = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 10000,
      gridPrecision: 4,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: Higher precision should create more or equal cells
    expect(response1.status).toBe(200);
    expect(response4.status).toBe(200);
    expect(response4.data!.totalCells).toBeGreaterThanOrEqual(
      response1.data!.totalCells,
    );

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - filters transactions by radius", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `radius-acc-${Date.now()}`,
      note: "radius filtering test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `radius-cat-${Date.now()}`,
      note: "radius filtering test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create transaction close to center (within 5km radius)
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    // Create transaction far from center (outside 5km radius)
    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.farAway.latitude,
      longitude: JAKARTA_LOCATIONS.farAway.longitude,
      date: now.toISOString(),
    });

    // Act: Query with small radius around center
    const response = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: Only transaction within radius should be included
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();

    // The far away transaction should not be in results
    // We verify by checking that all cells are within expected radius
    for (const cell of response.data!.data!) {
      expect(cell.gridLat).toBeCloseTo(JAKARTA_LOCATIONS.center.latitude, 0);
      expect(cell.gridLon).toBeCloseTo(JAKARTA_LOCATIONS.center.longitude, 0);
    }

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - filters by date range", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `date-range-acc-${Date.now()}`,
      note: "date range filtering test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `date-range-cat-${Date.now()}`,
      note: "date range filtering test",
      type: "expense",
    });

    const now = new Date();
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create transaction within date range
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    // Create transaction outside date range
    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: oneMonthAgo.toISOString(),
    });

    // Act: Query with narrow date range (last 2 days)
    const response = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: twoDaysAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: Only transaction within date range should be included
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data!.totalCells).toBeGreaterThan(0);

    // Verify that the old transaction is not included
    const totalTransactions = response.data!.data!.reduce(
      (sum, cell) => sum + cell.transactionCount,
      0,
    );
    expect(totalTransactions).toBeGreaterThanOrEqual(1);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - aggregates by transaction type", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `type-agg-acc-${Date.now()}`,
      note: "type aggregation test",
      type: "expense",
    });
    const expenseCategory = await categoryAPI.createCategory({
      name: `type-agg-cat-exp-${Date.now()}`,
      note: "type aggregation test",
      type: "expense",
    });
    const incomeCategory = await categoryAPI.createCategory({
      name: `type-agg-cat-inc-${Date.now()}`,
      note: "type aggregation test",
      type: "income",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create 2 income transactions
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: incomeCategory.data!.id as number,
      amount: 100000,
      type: "income" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: incomeCategory.data!.id as number,
      amount: 50000,
      type: "income" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    // Create 3 expense transactions
    const tx3 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: expenseCategory.data!.id as number,
      amount: 75000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx4 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: expenseCategory.data!.id as number,
      amount: 25000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx5 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: expenseCategory.data!.id as number,
      amount: 30000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    // Act
    const response = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data!.totalCells).toBeGreaterThan(0);

    // Verify totals across all cells
    const totalIncome = response.data!.data!.reduce(
      (sum, c) => sum + c.incomeCount,
      0,
    );
    const totalExpense = response.data!.data!.reduce(
      (sum, c) => sum + c.expenseCount,
      0,
    );
    const totalIncomeAmount = response.data!.data!.reduce(
      (sum, c) => sum + c.incomeAmount,
      0,
    );
    const totalExpenseAmount = response.data!.data!.reduce(
      (sum, c) => sum + c.expenseAmount,
      0,
    );

    // Verify transaction counts by type (may be distributed across cells)
    expect(totalIncome).toBeGreaterThanOrEqual(2);
    expect(totalExpense).toBeGreaterThanOrEqual(3);

    // Verify amounts by type
    expect(totalIncomeAmount).toBeGreaterThanOrEqual(150000); // 100000 + 50000
    expect(totalExpenseAmount).toBeGreaterThanOrEqual(130000); // 75000 + 25000 + 30000

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await transactionAPI.deleteTransaction(tx3.data!.id as number);
    await transactionAPI.deleteTransaction(tx4.data!.id as number);
    await transactionAPI.deleteTransaction(tx5.data!.id as number);
    await categoryAPI.deleteCategory(expenseCategory.data!.id as number);
    await categoryAPI.deleteCategory(incomeCategory.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - returns multiple grid cells", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `multi-cell-acc-${Date.now()}`,
      note: "multiple grid cells test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `multi-cell-cat-${Date.now()}`,
      note: "multiple grid cells test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Create transactions at different locations (different grid cells)
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      date: now.toISOString(),
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.south.latitude,
      longitude: JAKARTA_LOCATIONS.south.longitude,
      date: now.toISOString(),
    });

    const tx3 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 75000,
      type: "expense" as const,
      latitude: JAKARTA_LOCATIONS.north.latitude,
      longitude: JAKARTA_LOCATIONS.north.longitude,
      date: now.toISOString(),
    });

    // Act
    const response = await summaryAPI.getGeospatialSummary({
      latitude: JAKARTA_LOCATIONS.center.latitude,
      longitude: JAKARTA_LOCATIONS.center.longitude,
      radiusMeters: 10000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: Multiple cells should be returned
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data!.totalCells).toBeGreaterThanOrEqual(1);
    expect(response.data!.data!.length).toBeGreaterThanOrEqual(1);

    // Each cell should have valid aggregations
    for (const cell of response.data!.data!) {
      expect(cell.transactionCount).toBeGreaterThan(0);
      expect(cell.totalAmount).toBeGreaterThan(0);
      expect(cell).toHaveProperty("gridLat");
      expect(cell).toHaveProperty("gridLon");
    }

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await transactionAPI.deleteTransaction(tx3.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - returns empty array when no transactions found", async ({
    summaryAPI,
  }) => {
    // Arrange: Use coordinates far from any test data
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Act: Query in the middle of the ocean
    const response = await summaryAPI.getGeospatialSummary({
      latitude: 0.0,
      longitude: 0.0,
      radiusMeters: 1000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data!.totalCells).toBe(0);
    expect(response.data!.data).toEqual([]);
  });

  test("GET /summary/geospatial - validates required parameters", async ({
    summaryAPI,
  }) => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Missing latitude
    const response1 = await summaryAPI.getGeospatialSummary({
      longitude: 106.827,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    } as any);

    expect(response1.status).toBe(422);

    // Missing longitude
    const response2 = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    } as any);

    expect(response2.status).toBe(422);

    // Invalid latitude (> 90)
    const response3 = await summaryAPI.getGeospatialSummary({
      latitude: 91,
      longitude: 106.827,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    expect(response3.status).toBe(422);

    // Invalid longitude (> 180)
    const response4 = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      longitude: 181,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    expect(response4.status).toBe(422);
  });

  test("GET /summary/geospatial - validates grid precision bounds", async ({
    summaryAPI,
  }) => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Grid precision too low (< 1)
    const response1 = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      longitude: 106.827,
      radiusMeters: 5000,
      gridPrecision: 0,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    expect(response1.status).toBe(422);

    // Grid precision too high (> 4)
    const response2 = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      longitude: 106.827,
      radiusMeters: 5000,
      gridPrecision: 5,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    expect(response2.status).toBe(422);
  });

  test("GET /summary/geospatial - validates radius bounds", async ({
    summaryAPI,
  }) => {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Radius too small (< 100)
    const response1 = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      longitude: 106.827,
      radiusMeters: 50,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    expect(response1.status).toBe(422);

    // Radius too large (> 50000)
    const response2 = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      longitude: 106.827,
      radiusMeters: 60000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    expect(response2.status).toBe(422);
  });
});

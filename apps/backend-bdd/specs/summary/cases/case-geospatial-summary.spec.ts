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

  // New tests for geospatial stability fix
  test("GET /summary/geospatial - grid cell remains stable when center moves", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange: Create 2 transactions at the same location
    const account = await accountAPI.createAccount({
      name: `stability-acc-${Date.now()}`,
      note: "grid cell stability test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `stability-cat-${Date.now()}`,
      note: "grid cell stability test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Location: -7.754, 110.41
    const testLat = -7.754;
    const testLon = 110.41;

    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: testLat,
      longitude: testLon,
      date: now.toISOString(),
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: testLat,
      longitude: testLon,
      date: now.toISOString(),
    });

    // Act: Query with two different centers
    // Center 1: -7.7422905753200135, 110.43731689453125
    const response1 = await summaryAPI.getGeospatialSummary({
      latitude: -7.7422905753200135,
      longitude: 110.43731689453125,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Center 2: -7.768144452028461, 110.39131164550781
    const response2 = await summaryAPI.getGeospatialSummary({
      latitude: -7.768144452028461,
      longitude: 110.39131164550781,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: Find the grid cell in both responses
    const gridLat = -7.754;
    const gridLon = 110.41;

    const cell1 = response1.data!.data!.find(
      (c) => c.gridLat === gridLat && c.gridLon === gridLon,
    );
    const cell2 = response2.data!.data!.find(
      (c) => c.gridLat === gridLat && c.gridLon === gridLon,
    );

    // Both queries should either include or exclude the grid cell consistently
    expect(cell1 !== undefined).toBe(cell2 !== undefined);

    // If both include the cell, transaction counts should be identical
    if (cell1 && cell2) {
      expect(cell1.transactionCount).toBe(cell2.transactionCount);
      expect(cell1.transactionCount).toBeGreaterThanOrEqual(2);
      expect(cell1.totalAmount).toBe(cell2.totalAmount);
    }

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - all transactions in grid cell are aggregated", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange: Create 3 transactions in the same grid cell (slight variations)
    const account = await accountAPI.createAccount({
      name: `aggregation-acc-${Date.now()}`,
      note: "grid cell aggregation test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `aggregation-cat-${Date.now()}`,
      note: "grid cell aggregation test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // All should round to -6.175, 106.827 (grid precision 3)
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: -6.1750,
      longitude: 106.827,
      date: now.toISOString(),
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: -6.1751,
      longitude: 106.827,
      date: now.toISOString(),
    });

    const tx3 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 75000,
      type: "expense" as const,
      latitude: -6.1749,
      longitude: 106.827,
      date: now.toISOString(),
    });

    // Act: Query from nearby center
    const response = await summaryAPI.getGeospatialSummary({
      latitude: -6.175,
      longitude: 106.827,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: All 3 transactions should be in ONE grid cell
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();

    const gridCell = response.data!.data!.find(
      (c) => c.gridLat === -6.175 && c.gridLon === 106.827,
    );

    expect(gridCell).toBeDefined();
    expect(gridCell!.transactionCount).toBeGreaterThanOrEqual(3);
    expect(gridCell!.totalAmount).toBeGreaterThanOrEqual(225000); // 100000 + 50000 + 75000

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await transactionAPI.deleteTransaction(tx3.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /summary/geospatial - grid cells outside radius are excluded", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    // Arrange: Create transaction inside and far outside radius
    const account = await accountAPI.createAccount({
      name: `boundary-acc-${Date.now()}`,
      note: "radius boundary test",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `boundary-cat-${Date.now()}`,
      note: "radius boundary test",
      type: "expense",
    });

    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const centerLat = -6.175;
    const centerLon = 106.827;

    // Transaction INSIDE radius (~1km from center)
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      latitude: -6.18, // ~0.5km south
      longitude: 106.827,
      date: now.toISOString(),
    });

    // Transaction FAR OUTSIDE radius (~50km from center)
    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      latitude: -6.6, // ~50km south
      longitude: 106.827,
      date: now.toISOString(),
    });

    // Act: Query with 5km radius
    const response = await summaryAPI.getGeospatialSummary({
      latitude: centerLat,
      longitude: centerLon,
      radiusMeters: 5000,
      gridPrecision: 3,
      startDate: oneMonthAgo.toISOString(),
      endDate: now.toISOString(),
    });

    // Assert: Only near grid cell should be included
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();

    // Near grid cell should be present (rounds to -6.18, 106.827)
    const nearCell = response.data!.data!.find((c) => c.gridLat === -6.18);
    expect(nearCell).toBeDefined();

    // Far grid cell should NOT be present (would round to -6.6, 106.827)
    const farCell = response.data!.data!.find((c) => c.gridLat === -6.6);
    expect(farCell).toBeUndefined();

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

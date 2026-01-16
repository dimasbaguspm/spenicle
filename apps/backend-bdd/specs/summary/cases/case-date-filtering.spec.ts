import { test, expect } from "@fixtures/index";

test.describe("Summary - Date Filtering Cases", () => {
  test("GET /summary/accounts - same day range works", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `date-acc-${Date.now()}`,
      note: "date test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `date-cat-${Date.now()}`,
      note: "date test",
      type: "expense",
    });

    const now = new Date().toISOString();
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: now,
      type: "expense" as const,
    });

    const accSum = await summaryAPI.getAccountSummary({
      startDate: now,
      endDate: now,
    });
    expect(accSum.status).toBe(200);
    expect(accSum.data).toBeDefined();

    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("GET /summary/categories - date range filtering works", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `date-cat-acc-${Date.now()}`,
      note: "date test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `date-cat-${Date.now()}`,
      note: "date test",
      type: "expense",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    // Create transaction yesterday
    const tx1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50,
      categoryId: cat.data!.id as number,
      date: yesterday,
      type: "expense" as const,
    });

    // Create transaction today
    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 75,
      categoryId: cat.data!.id as number,
      date: today,
      type: "expense" as const,
    });

    // Test filtering for today only
    const catSum = await summaryAPI.getCategorySummary({
      startDate: today,
      endDate: tomorrow,
    });
    expect(catSum.status).toBe(200);
    expect(catSum.data).toBeDefined();

    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("GET /summary/transactions - frequency grouping works", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `freq-acc-${Date.now()}`,
      note: "frequency test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `freq-cat-${Date.now()}`,
      note: "frequency test",
      type: "expense",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const tx1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: yesterday,
      type: "expense" as const,
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 200,
      categoryId: cat.data!.id as number,
      date: today,
      type: "expense" as const,
    });

    // Test daily frequency
    const dailySum = await summaryAPI.getTransactionSummary({
      startDate: yesterday,
      endDate: tomorrow,
      frequency: "daily",
    });
    expect(dailySum.status).toBe(200);
    expect(dailySum.data).toBeDefined();

    // Test monthly frequency
    const monthlySum = await summaryAPI.getTransactionSummary({
      startDate: yesterday,
      endDate: tomorrow,
      frequency: "monthly",
    });
    expect(monthlySum.status).toBe(200);
    expect(monthlySum.data).toBeDefined();

    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("GET /summary/transactions - boundary dates and single-day grouping", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `boundary-acc-${Date.now()}`,
      note: "boundary test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `boundary-cat-${Date.now()}`,
      note: "boundary test",
      type: "expense",
    });

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();

    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 150,
      categoryId: cat.data!.id as number,
      date: now.toISOString(),
      type: "expense" as const,
    });

    const txSum = await summaryAPI.getTransactionSummary({
      startDate: startOfDay,
      endDate: endOfDay,
      frequency: "daily",
    });
    expect(txSum.status).toBe(200);
    expect(txSum.data).toBeDefined();

    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

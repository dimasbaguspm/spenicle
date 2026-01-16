import { test, expect } from "@fixtures/index";

test.describe("Summary - Category Summary Cases", () => {
  test("GET /summary/categories - aggregates large amounts and groups by category", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `large-cat-acc-${Date.now()}`,
      note: "large amounts test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `large-cat-${Date.now()}`,
      note: "large amounts test",
      type: "expense",
    });

    const now = new Date().toISOString();

    // Create transactions with very large amounts
    const t1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 5_000_000_000_000,
      categoryId: cat.data!.id as number,
      date: now,
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 6_000_000_000_000,
      categoryId: cat.data!.id as number,
      date: now,
      type: "expense" as const,
    });

    const from = new Date(Date.now() - 3600 * 1000).toISOString();
    const to = new Date(Date.now() + 3600 * 1000).toISOString();

    const catSum = await summaryAPI.getCategorySummary({
      startDate: from,
      endDate: to,
    });
    expect(catSum.status).toBe(200);
    expect(catSum.data).toBeDefined();
    const catItems = catSum.data?.data ?? [];
    expect(Array.isArray(catItems)).toBe(true);
    expect(catItems.length).toBeGreaterThanOrEqual(1);

    // Find our category in the results
    const ourCategory = catItems.find((item) => item.id === cat.data!.id);
    expect(ourCategory).toBeDefined();
    expect(Number(ourCategory!.expenseAmount)).toBe(11_000_000_000_000);

    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("GET /summary/categories - transfers do not contribute to income/expense sums", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `cat-transfer-a1-${Date.now()}`,
      note: "transfer test",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `cat-transfer-a2-${Date.now()}`,
      note: "transfer test",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `cat-transfer-ce-${Date.now()}`,
      note: "transfer test",
      type: "expense",
    });
    const catT = await categoryAPI.createCategory({
      name: `cat-transfer-ct-${Date.now()}`,
      note: "transfer test",
      type: "transfer",
    });

    const now = new Date().toISOString();

    // Regular expense transaction
    const expenseTx = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: catE.data!.id as number,
      date: now,
      type: "expense" as const,
    });

    // Transfer transaction
    const transferTx = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      destinationAccountId: a2.data!.id as number,
      amount: 50,
      categoryId: catT.data!.id as number,
      date: now,
      type: "transfer" as const,
    });

    const catSum = await summaryAPI.getCategorySummary({
      startDate: now,
      endDate: now,
    });
    expect(catSum.status).toBe(200);
    expect(catSum.data).toBeDefined();
    const catItems = catSum.data?.data ?? [];

    // Find expense category
    const expenseCat = catItems.find((item) => item.id === catE.data!.id);
    expect(expenseCat).toBeDefined();
    expect(Number(expenseCat!.expenseAmount)).toBe(100);

    // Transfer category appears in category summary but with zero amounts (transfers don't count as income/expense)
    const transferCat = catItems.find((item) => item.id === catT.data!.id);
    expect(transferCat).toBeDefined();
    expect(Number(transferCat!.expenseAmount)).toBe(0);
    expect(Number(transferCat!.incomeAmount)).toBe(0);

    await transactionAPI.deleteTransaction(expenseTx.data!.id as number);
    await transactionAPI.deleteTransaction(transferTx.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catT.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });

  test("GET /summary/categories - filters and aggregated amounts reflect transactions", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `cat-filter-a1-${Date.now()}`,
      note: "category filter test",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `cat-filter-ce-${Date.now()}`,
      note: "category filter test",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `cat-filter-ci-${Date.now()}`,
      note: "category filter test",
      type: "income",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();

    // Create transactions in different categories
    const t1 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 200,
      categoryId: catE.data!.id as number,
      date: yesterday,
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 300,
      categoryId: catI.data!.id as number,
      date: today,
      type: "income" as const,
    });

    const catSum = await summaryAPI.getCategorySummary({
      startDate: yesterday,
      endDate: today,
    });
    expect(catSum.status).toBe(200);
    expect(catSum.data).toBeDefined();
    const catItems = catSum.data?.data ?? [];

    // Should have both categories
    const expenseCat = catItems.find((item) => item.id === catE.data!.id);
    const incomeCat = catItems.find((item) => item.id === catI.data!.id);

    expect(expenseCat).toBeDefined();
    expect(incomeCat).toBeDefined();
    expect(Number(expenseCat!.expenseAmount)).toBe(200);
    expect(Number(incomeCat!.incomeAmount)).toBe(300);

    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
  });
});

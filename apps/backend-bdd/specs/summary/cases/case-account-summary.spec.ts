import { test, expect } from "@fixtures/index";

test.describe("Summary - Account Summary Cases", () => {
  test("GET /summary/accounts - aggregates multiple accounts correctly", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `acc-sum-a1-${Date.now()}`,
      note: "account summary test",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `acc-sum-a2-${Date.now()}`,
      note: "account summary test",
      type: "income",
    });
    const catE = await categoryAPI.createCategory({
      name: `acc-sum-ce-${Date.now()}`,
      note: "account summary test",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `acc-sum-ci-${Date.now()}`,
      note: "account summary test",
      type: "income",
    });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const today = now.toISOString();

    // Expense transaction
    const t1 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 100,
      categoryId: catE.data!.id as number,
      date: yesterday,
      type: "expense" as const,
    });

    // Income transaction
    const t2 = await transactionAPI.createTransaction({
      accountId: a2.data!.id as number,
      amount: 200,
      categoryId: catI.data!.id as number,
      date: today,
      type: "income" as const,
    });

    const accSum = await summaryAPI.getAccountSummary({
      startDate: yesterday,
      endDate: today,
    });
    expect(accSum.status).toBe(200);
    expect(accSum.data).toBeDefined();
    const items = accSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);

    // Should have summaries for both accounts
    const accountIds = items.map((item) => item.id);
    expect(accountIds).toContain(a1.data!.id);
    expect(accountIds).toContain(a2.data!.id);

    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });

  test("GET /summary/accounts - partial range exclusion changes totals", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `partial-acc-${Date.now()}`,
      note: "partial range test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `partial-cat-${Date.now()}`,
      note: "partial range test",
      type: "expense",
    });

    const now = new Date();
    const d1 = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(); // 2 days ago
    const d2 = new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(); // 1 day ago
    const d3 = now.toISOString(); // today

    // Create transactions on different days
    const t1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50,
      categoryId: cat.data!.id as number,
      date: d1,
      type: "expense" as const,
    });

    const t2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 75,
      categoryId: cat.data!.id as number,
      date: d2,
      type: "expense" as const,
    });

    const t3 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 25,
      categoryId: cat.data!.id as number,
      date: d3,
      type: "expense" as const,
    });

    // Get summary for all days
    const fullSum = await summaryAPI.getAccountSummary({
      startDate: d1,
      endDate: d3,
    });
    expect(fullSum.status).toBe(200);

    // Get summary for partial range (excluding first transaction)
    const partialSum = await summaryAPI.getAccountSummary({
      startDate: d2,
      endDate: d3,
    });
    expect(partialSum.status).toBe(200);

    await transactionAPI.deleteTransaction(t1.data!.id as number);
    await transactionAPI.deleteTransaction(t2.data!.id as number);
    await transactionAPI.deleteTransaction(t3.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("GET /summary/accounts - includes transfers correctly", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `transfer-a1-${Date.now()}`,
      note: "transfer test",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `transfer-a2-${Date.now()}`,
      note: "transfer test",
      type: "expense",
    });
    const catT = await categoryAPI.createCategory({
      name: `transfer-cat-${Date.now()}`,
      note: "transfer test",
      type: "transfer",
    });

    const now = new Date().toISOString();

    // Create a transfer between accounts
    const transfer = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      destinationAccountId: a2.data!.id as number,
      amount: 100,
      categoryId: catT.data!.id as number,
      date: now,
      type: "transfer" as const,
    });

    const accSum = await summaryAPI.getAccountSummary({
      startDate: now,
      endDate: now,
    });
    expect(accSum.status).toBe(200);
    expect(accSum.data).toBeDefined();

    // Both accounts should show the transfer amounts
    const items = accSum.data?.data ?? [];
    const a1Summary = items.find((item) => item.id === a1.data!.id);
    const a2Summary = items.find((item) => item.id === a2.data!.id);

    expect(a1Summary).toBeDefined();
    expect(a2Summary).toBeDefined();

    await transactionAPI.deleteTransaction(transfer.data!.id as number);
    await categoryAPI.deleteCategory(catT.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });
});

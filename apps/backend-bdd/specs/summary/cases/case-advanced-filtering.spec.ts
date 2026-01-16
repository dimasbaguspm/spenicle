import { test, expect } from "@fixtures/index";

test.describe("Summary - Advanced Filtering", () => {
  test("transaction summary: daily/monthly/yearly frequency consistency", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `adv-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `adv-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const base = new Date();
    const d0 = new Date(base.getTime() - 5 * 24 * 3600 * 1000); // 5 days ago
    const d1 = new Date(base.getTime() - 2 * 24 * 3600 * 1000); // 2 days ago
    const d2 = new Date(base.getTime() + 40 * 24 * 3600 * 1000); // 40 days ahead (next month)

    const s0 = d0.toISOString();
    const s1 = d1.toISOString();
    const s2 = d2.toISOString();

    const tx0 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 10,
      categoryId: cat.data!.id as number,
      date: s0,
      type: "expense" as const,
    });
    expect(tx0.status).toBeGreaterThanOrEqual(200);
    const tx1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 20,
      categoryId: cat.data!.id as number,
      date: s1,
      type: "income" as const,
    });
    expect(tx1.status).toBeGreaterThanOrEqual(200);
    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 30,
      categoryId: cat.data!.id as number,
      date: s2,
      type: "expense" as const,
    });
    expect(tx2.status).toBeGreaterThanOrEqual(200);

    // daily frequency covering s0..s1 should include two distinct daily periods
    const daily = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s1,
      frequency: "daily",
    });
    expect(daily.status).toBeGreaterThanOrEqual(200);
    const dailyItems = daily.data?.data ?? [];
    expect(dailyItems.length).toBeGreaterThanOrEqual(2);

    // monthly frequency covering s0..s2 should group into at most two months
    const monthly = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s2,
      frequency: "monthly",
    });
    expect(monthly.status).toBeGreaterThanOrEqual(200);
    const monthlyItems = monthly.data?.data ?? [];
    expect(monthlyItems.length).toBeGreaterThanOrEqual(1);
    expect(monthlyItems.length).toBeLessThanOrEqual(3);

    // yearly grouping should aggregate into 1 or 2 depending on year boundary
    const yearly = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s2,
      frequency: "yearly",
    });
    expect(yearly.status).toBeGreaterThanOrEqual(200);
    const yearlyItems = yearly.data?.data ?? [];
    expect(yearlyItems.length).toBeGreaterThanOrEqual(1);

    // Validate numeric consistency: sum of monthly net equals sum of daily nets in overlapping range
    const sumNet = (arr: any[]) =>
      arr.reduce((acc: number, it: any) => acc + Number(it.net || 0), 0);
    const monthlyNet = sumNet(monthlyItems);
    // fetch daily for the same monthly range start..end
    const dailyAll = await summaryAPI.getTransactionSummary({
      startDate: s0,
      endDate: s2,
      frequency: "daily",
    });
    const dailyAllItems = dailyAll.data?.data ?? [];
    const dailyNet = sumNet(dailyAllItems);
    expect(monthlyNet).toBe(dailyNet);

    // cleanup
    for (const t of [tx0, tx1, tx2])
      if (t.data && t.data.id)
        await transactionAPI.deleteTransaction(t.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("account summary: partial range exclusion changes totals", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a = await accountAPI.createAccount({
      name: `adv2-a-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `adv2-c-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const n = new Date();
    const old = new Date(n.getTime() - 10 * 24 * 3600 * 1000).toISOString();
    const recent = new Date(n.getTime() - 1 * 24 * 3600 * 1000).toISOString();

    const txOld = await transactionAPI.createTransaction({
      accountId: a.data!.id as number,
      amount: 500,
      categoryId: cat.data!.id as number,
      date: old,
      type: "expense" as const,
    });
    const txRecent = await transactionAPI.createTransaction({
      accountId: a.data!.id as number,
      amount: 200,
      categoryId: cat.data!.id as number,
      date: recent,
      type: "income" as const,
    });

    const full = await summaryAPI.getAccountSummary({
      startDate: old,
      endDate: recent,
    });
    const fullItems = full.data?.data ?? [];
    const mapFull = new Map(fullItems.map((it: any) => [it.id, it]));
    const entry = mapFull.get(a.data!.id as number);
    const expectedSum =
      (txOld.data ? Number(txOld.data.amount) : 0) +
      (txRecent.data ? Number(txRecent.data.amount) : 0);
    expect(
      Number(entry.expenseAmount || 0) + Number(entry.incomeAmount || 0)
    ).toBe(expectedSum);

    const partial = await summaryAPI.getAccountSummary({
      startDate: recent,
      endDate: recent,
    });
    const partItems = partial.data?.data ?? [];
    const mapPart = new Map(partItems.map((it: any) => [it.id, it]));
    const pEntry = mapPart.get(a.data!.id as number);
    expect(Number(pEntry.incomeAmount || 0)).toBe(
      txRecent.data ? Number(txRecent.data.amount) : 0
    );

    if (txOld.data && txOld.data.id)
      await transactionAPI.deleteTransaction(txOld.data!.id as number);
    if (txRecent.data && txRecent.data.id)
      await transactionAPI.deleteTransaction(txRecent.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(a.data!.id as number);
  });

  test("category summary: transfers do not contribute to income/expense sums", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `adv3-a1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `adv3-a2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const catTransfer = await categoryAPI.createCategory({
      name: `adv3-ct-${Date.now()}`,
      note: "t",
      type: "transfer",
    });

    const now = new Date().toISOString();
    const t = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 300,
      destinationAccountId: a2.data!.id as number,
      categoryId: catTransfer.data!.id as number,
      date: now,
      type: "transfer" as const,
    });
    expect(t.status).toBeGreaterThanOrEqual(200);

    const catSum = await summaryAPI.getCategorySummary({
      startDate: now,
      endDate: now,
    });
    const items = catSum.data?.data ?? [];
    const me = items.find((it) => it.id === catTransfer.data!.id);
    expect(Number(me?.incomeAmount || 0)).toBe(0);
    expect(Number(me?.expenseAmount || 0)).toBe(0);

    // cleanup
    if (t.data && t.data.id)
      await transactionAPI.deleteTransaction(t.data!.id as number);
    await categoryAPI.deleteCategory(catTransfer.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Summary - Filtering & Calculations", () => {
  test("account summary: filters and calculation match transactions in range", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `fa-a1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `fa-a2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `fa-ce-${Date.now()}`,
      note: "ce",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `fa-ci-${Date.now()}`,
      note: "ci",
      type: "income",
    });
    const catT = await categoryAPI.createCategory({
      name: `fa-ci-${Date.now()}`,
      note: "ci",
      type: "transfer",
    });

    const now = new Date();
    const d1 = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const d0 = now.toISOString();

    const prevAcc = await summaryAPI.getAccountSummary({
      startDate: d1,
      endDate: d0,
    });
    expect(prevAcc.status).toBe(200);
    const prevAccItems = prevAcc.data?.data ?? [];

    const t2 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 50,
      categoryId: catE.data!.id as number,
      date: d1,
      type: "expense",
    });
    const t3 = await transactionAPI.createTransaction({
      accountId: a2.data!.id as number,
      amount: 200,
      categoryId: catI.data!.id as number,
      date: d1,
      type: "income",
    });
    const t4 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 25,
      categoryId: catE.data!.id as number,
      date: d0,
      type: "expense",
    });
    const t5 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 30,
      destinationAccountId: a2.data!.id as number,
      categoryId: catT.data!.id as number,
      date: d1,
      type: "transfer",
    });

    expect(t2.status).toBe(200);
    expect(t3.status).toBe(200);
    expect(t4.status).toBe(200);
    expect(t5.status).toBe(200);

    const accSum = await summaryAPI.getAccountSummary({
      startDate: d1,
      endDate: d0,
    });
    expect(accSum.status).toBe(200);
    const accItems = accSum.data?.data ?? [];
    expect(Array.isArray(accItems)).toBe(true);

    const byId = (arr: any[]) => new Map(arr.map((it) => [it.id, it]));
    const map = byId(accItems);
    const a1sum = map.get(a1.data!.id as number);
    const a2sum = map.get(a2.data!.id as number);

    expect(a1sum).toBeDefined();

    // compute expected sums from created transactions (respecting types)
    const created = [t2, t3, t4, t5]
      .map((r) => r.data)
      .filter(Boolean) as any[];
    const inRange = (d: string, start: string, end: string) => {
      const td = new Date(d).toISOString().slice(0, 10);
      const sd = new Date(start).toISOString().slice(0, 10);
      const ed = new Date(end).toISOString().slice(0, 10);
      return td >= sd && td <= ed;
    };
    const getAccountId = (c: any) => c.accountId ?? c.account?.id;
    const matchesAccount = (c: any, acc: any) => {
      if (!c) return false;
      if (getAccountId(c) && getAccountId(c) === acc.data!.id) return true;
      if (c.account && acc.data && c.account.name === acc.data.name)
        return true;
      return false;
    };
    const expectedExpenseA1 = created
      .filter(
        (c) =>
          matchesAccount(c, a1) &&
          c.type === "expense" &&
          inRange(c.date, d1, d0)
      )
      .reduce((s, c) => s + Number(c.amount), 0);
    const expectedIncomeA2 = created
      .filter(
        (c) =>
          matchesAccount(c, a2) &&
          c.type === "income" &&
          inRange(c.date, d1, d0)
      )
      .reduce((s, c) => s + Number(c.amount), 0);

    // compare deltas so tests are robust against pre-existing DB state
    const prevMap = (arr: any[]) => new Map(arr.map((it) => [it.id, it]));
    const pmap = prevMap(prevAccItems as any[]);
    const prevA1 = pmap.get(a1.data!.id as number);
    const prevA2 = pmap.get(a2.data!.id as number);
    const prevA1Expense = prevA1 ? Number(prevA1.expenseAmount) : 0;
    const prevA2Income = prevA2 ? Number(prevA2.incomeAmount) : 0;

    expect(a2sum).toBeDefined();
    expect(Number(a1sum.expenseAmount) - prevA1Expense).toBe(expectedExpenseA1);
    expect(Number(a2sum.incomeAmount) - prevA2Income).toBe(expectedIncomeA2);

    // cleanup
    for (const t of [t2, t3, t4, t5])
      if (t.data && t.data.id)
        await transactionAPI.deleteTransaction(t.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
    await categoryAPI.deleteCategory(catT.data!.id as number);
  });

  test("category summary: filters and aggregated amounts reflect transactions", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `fc-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `fc-ce-${Date.now()}`,
      note: "ce",
      type: "expense",
    });
    const catI = await categoryAPI.createCategory({
      name: `fc-ci-${Date.now()}`,
      note: "ci",
      type: "income",
    });

    const now = new Date();
    const from = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString();
    const to = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const t1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: catE.data!.id as number,
      date: from,
      type: "expense",
    });
    const t2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 150,
      categoryId: catE.data!.id as number,
      date: from,
      type: "expense",
    });
    const t3 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50,
      categoryId: catI.data!.id as number,
      date: to,
      type: "income",
    });

    const catSum = await summaryAPI.getCategorySummary({
      startDate: from,
      endDate: to,
    });
    expect(catSum.status).toBe(200);
    const items = catSum.data?.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    const byId = (arr: any[]) => new Map(arr.map((it) => [it.id, it]));
    const map = byId(items as any[]);
    const ce = map.get(catE.data!.id as number);
    const ci = map.get(catI.data!.id as number);
    expect(ce).toBeDefined();
    expect(Number(ce.expenseAmount)).toBe(250);
    expect(ci).toBeDefined();
    expect(Number(ci.incomeAmount)).toBe(50);

    // cleanup
    for (const t of [t1, t2, t3])
      if (t && t.data && t.data.id)
        await transactionAPI.deleteTransaction(t.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await categoryAPI.deleteCategory(catI.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("transaction summary: daily grouping and transfer aggregation", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
    summaryAPI,
  }) => {
    const a1 = await accountAPI.createAccount({
      name: `ft-a1-${Date.now()}`,
      note: "a1",
      type: "expense",
    });
    const a2 = await accountAPI.createAccount({
      name: `ft-a2-${Date.now()}`,
      note: "a2",
      type: "expense",
    });
    const catE = await categoryAPI.createCategory({
      name: `ft-ce-${Date.now()}`,
      note: "ce",
      type: "expense",
    });

    const now = new Date();
    const d1 = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const d0 = now.toISOString();

    // snapshot previous summary so we can assert only the delta created by these transactions
    const prev = await summaryAPI.getTransactionSummary({
      startDate: d1,
      endDate: d0,
      frequency: "daily" as any,
    });
    expect(prev.status).toBe(200);
    const prevItems = prev.data?.data ?? [];

    const t1 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 50,
      categoryId: catE.data!.id as number,
      date: d1,
      type: "expense",
    });
    const t2 = await transactionAPI.createTransaction({
      accountId: a2.data!.id as number,
      amount: 200,
      categoryId: catE.data!.id as number,
      date: d1,
      type: "income",
    });
    const t3 = await transactionAPI.createTransaction({
      accountId: a1.data!.id as number,
      amount: 30,
      destinationAccountId: a2.data!.id as number,
      date: d1,
      categoryId: catE.data!.id as number,
      type: "transfer",
    });

    const txSum = await summaryAPI.getTransactionSummary({
      startDate: d1,
      endDate: d0,
      frequency: "daily",
    });
    expect(txSum.status).toBe(200);
    const txItems = txSum.data?.data ?? [];
    expect(Array.isArray(txItems)).toBe(true);
    const period = new Date(d1).toISOString().slice(0, 10);
    const pAfter = txItems.find(
      (it) => it.period && it.period.startsWith(period)
    );
    const pBefore = prevItems.find(
      (it) => it.period && it.period.startsWith(period)
    );
    expect(pAfter).toBeDefined();

    const createdTxs = [t1, t2, t3].map((r) => r.data).filter(Boolean) as any[];
    const createdIncome = createdTxs
      .filter((c) => c.type === "income")
      .reduce((s, c) => s + Number(c.amount), 0);
    const createdExpense = createdTxs
      .filter((c) => c.type === "expense")
      .reduce((s, c) => s + Number(c.amount), 0);
    const createdTransfer = createdTxs
      .filter((c) => c.type === "transfer")
      .reduce((s, c) => s + Number(c.amount), 0);

    const prevIncome = pBefore ? Number(pBefore.incomeAmount) : 0;
    const prevExpense = pBefore ? Number(pBefore.expenseAmount) : 0;
    const prevTransfer = pBefore ? Number(pBefore.transferAmount) : 0;

    expect(Number(pAfter!.incomeAmount) - prevIncome).toBe(createdIncome);
    expect(Number(pAfter!.expenseAmount) - prevExpense).toBe(createdExpense);
    expect(Number(pAfter!.transferAmount) - prevTransfer).toBe(createdTransfer);

    // cleanup
    for (const t of [t1, t2, t3])
      if (t && t.data && t.data.id)
        await transactionAPI.deleteTransaction(t.data!.id as number);
    await categoryAPI.deleteCategory(catE.data!.id as number);
    await accountAPI.deleteAccount(a1.data!.id as number);
    await accountAPI.deleteAccount(a2.data!.id as number);
  });
});

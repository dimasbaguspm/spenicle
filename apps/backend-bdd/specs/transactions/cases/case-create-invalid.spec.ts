import { test, expect } from "@fixtures/index";

test.describe("Transactions - Create Invalid Cases", () => {
  test("missing required fields returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    // missing amount
    const r1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      // amount missing
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
    } as any);
    expect(r1.status).toBeGreaterThanOrEqual(400);

    const r2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "invalid",
    } as any);
    expect(r2.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("invalid date format and invalid amount types return 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-acc2-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-cat2-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    // invalid date string (not RFC3339)
    const r1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      // intentionally invalid date
      date: "2026-01-15",
      type: "expense",
    } as any);
    expect(r1.status).toBeGreaterThanOrEqual(400);

    // amount as string
    const r2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: "one hundred",
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
    } as any);
    expect(r2.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Transactions - Nonexistent References", () => {
  test("creating with non-existent account returns 400", async ({
    transactionAPI,
    categoryAPI,
  }) => {
    const cat = await categoryAPI.createCategory({
      name: `nr-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const res = await transactionAPI.createTransaction({
      accountId: 99999999,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });

  test("creating with non-existent category returns 400", async ({
    transactionAPI,
    accountAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `nr-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const res = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: 99999999,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("transfer with non-existent destination account returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc1 = await accountAPI.createAccount({
      name: `nr-acc-t1-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `nr-cat-t-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const res = await transactionAPI.createTransaction({
      accountId: acc1.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "transfer" as const,
      destinationAccountId: 99999999,
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);

    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc1.data!.id as number);
  });

  test("changing category type doesn't change existing transaction but blocks new mismatched transactions", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `chg-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `chg-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    // create an expense transaction with this category
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 120,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx.status).toBeGreaterThanOrEqual(200);

    // change category to income
    const updated = await categoryAPI.updateCategory(cat.data!.id as number, {
      type: "income",
    });
    expect(updated.status).toBeGreaterThanOrEqual(200);

    // existing transaction should still be retrievable and balance unaffected
    const detail = await transactionAPI.getTransaction(tx.data!.id as number);
    expect(detail.status).toBeGreaterThanOrEqual(200);
    const accAfter = await accountAPI.getAccount(acc.data!.id as number);
    expect(accAfter.status).toBeGreaterThanOrEqual(200);
    // balance still reflects the original expense
    expect(accAfter.data!.amount).toBe(-120);

    // attempting to create another expense with this category should now fail
    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 50,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    } as any);
    expect(tx2.status).toBeGreaterThanOrEqual(400);

    // cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("changing account type does not retroactively convert balances and allows subsequent transactions", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `chg-acc2-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `chg-cat2-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 200,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx.status).toBeGreaterThanOrEqual(200);

    // change account type to income
    const accUpdated = await accountAPI.updateAccount(acc.data!.id as number, {
      type: "income",
    });
    expect(accUpdated.status).toBeGreaterThanOrEqual(200);

    // balance should remain reflecting the earlier expense
    const accAfter = await accountAPI.getAccount(acc.data!.id as number);
    expect(accAfter.data!.amount).toBe(-200);

    // creating another expense transaction should still be allowed (backend does not restrict by account type)
    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 100,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    });
    expect(tx2.status).toBeGreaterThanOrEqual(200);

    // balance should update accordingly
    const accFinal = await accountAPI.getAccount(acc.data!.id as number);
    expect(accFinal.data!.amount).toBe(-300);

    // cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

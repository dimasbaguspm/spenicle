import { test, expect } from "@fixtures/index";

test.describe("Transactions - Multi-Currency", () => {
  test("POST /transactions - create USD expense with correct conversion", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange: Create account and category
    const base = `mc-usd-${Date.now()}`;
    const acc = await accountAPI.createAccount({
      name: `${base}-acc`,
      note: "multi-currency test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `${base}-cat`,
      note: "expense",
      type: "expense",
    });

    const accountId = acc.data!.id as number;
    const categoryId = cat.data!.id as number;
    const initialBalance = acc.data!.amount || 0;

    // Act: Create USD expense
    const createRes = await transactionAPI.createTransaction({
      type: "expense",
      date: new Date().toISOString(),
      amount: 100, // $100 USD
      currencyCode: "USD",
      accountId,
      categoryId,
      note: "USD expense test",
    });

    // Assert
    expect(createRes.status).toBe(200);
    expect(createRes.data!.currencyCode).toBe("USD");
    expect(createRes.data!.amountForeign).toBe(100);
    expect(createRes.data!.exchangeRate).toBeDefined();
    expect(createRes.data!.exchangeRate).toBeGreaterThan(0);
    expect(createRes.data!.exchangeAt).toBeDefined();

    // Verify base amount is correctly converted (amount = amountForeign * exchangeRate)
    const expectedBaseAmount = 100 * (createRes.data!.exchangeRate || 0);
    expect(
      Math.abs(createRes.data!.amount - Math.round(expectedBaseAmount)),
    ).toBeLessThanOrEqual(1);

    // Verify account balance decreased
    const getAccRes = await accountAPI.getAccount(accountId);
    expect(getAccRes.data!.amount).toBeLessThan(initialBalance);

    // Cleanup
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions - create EUR income with correct conversion", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const base = `mc-eur-${Date.now()}`;
    const acc = await accountAPI.createAccount({
      name: `${base}-acc`,
      note: "multi-currency test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `${base}-cat`,
      note: "income",
      type: "income",
    });

    const accountId = acc.data!.id as number;
    const categoryId = cat.data!.id as number;
    const initialBalance = acc.data!.amount || 0;

    // Act: Create EUR income
    const createRes = await transactionAPI.createTransaction({
      type: "income",
      date: new Date().toISOString(),
      amount: 500, // €500 EUR
      currencyCode: "EUR",
      accountId,
      categoryId,
      note: "EUR income test",
    });

    // Assert
    expect(createRes.status).toBe(200);
    expect(createRes.data!.currencyCode).toBe("EUR");
    expect(createRes.data!.amountForeign).toBe(500);
    expect(createRes.data!.exchangeRate).toBeDefined();
    expect(createRes.data!.exchangeRate).toBeGreaterThan(0);

    // Verify account balance increased
    const getAccRes = await accountAPI.getAccount(accountId);
    expect(getAccRes.data!.amount).toBeGreaterThan(initialBalance);

    // Cleanup
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions - create multi-currency transfer between accounts", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange: Create two accounts
    const base = `mc-transfer-${Date.now()}`;
    const acc1 = await accountAPI.createAccount({
      name: `${base}-acc1`,
      note: "source",
      type: "expense",
    });
    const acc2 = await accountAPI.createAccount({
      name: `${base}-acc2`,
      note: "destination",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `${base}-cat`,
      note: "transfer",
      type: "transfer",
    });

    const acc1Id = acc1.data!.id as number;
    const acc2Id = acc2.data!.id as number;
    const categoryId = cat.data!.id as number;
    const acc1InitialBalance = acc1.data!.amount || 0;
    const acc2InitialBalance = acc2.data!.amount || 0;
    const totalInitialBalance = acc1InitialBalance + acc2InitialBalance;

    // Act: Create SGD transfer
    const transferRes = await transactionAPI.createTransaction({
      type: "transfer",
      date: new Date().toISOString(),
      amount: 1000, // S$1,000 SGD
      currencyCode: "SGD",
      accountId: acc1Id,
      destinationAccountId: acc2Id,
      categoryId,
      note: "SGD transfer test",
    });

    // Assert
    expect(transferRes.status).toBe(200);
    expect(transferRes.data!.currencyCode).toBe("SGD");
    expect(transferRes.data!.amountForeign).toBe(1000);
    expect(transferRes.data!.exchangeRate).toBeDefined();
    expect(transferRes.data!.exchangeRate).toBeGreaterThan(0);

    // Verify conversion math: amount = amountForeign * exchangeRate
    const expectedSgdBaseAmount = 1000 * (transferRes.data!.exchangeRate || 0);
    expect(
      Math.abs(transferRes.data!.amount - Math.round(expectedSgdBaseAmount)),
    ).toBeLessThanOrEqual(1);

    // Verify both accounts reflect correct balance changes
    const getAcc1 = await accountAPI.getAccount(acc1Id);
    const getAcc2 = await accountAPI.getAccount(acc2Id);
    const acc1FinalBalance = getAcc1.data!.amount || 0;
    const acc2FinalBalance = getAcc2.data!.amount || 0;

    // Account 1 should have decreased
    expect(acc1FinalBalance).toBeLessThan(acc1InitialBalance);
    // Account 2 should have increased
    expect(acc2FinalBalance).toBeGreaterThan(acc2InitialBalance);

    // System balance should be unchanged (allow 2 IDR rounding difference)
    const totalFinalBalance = acc1FinalBalance + acc2FinalBalance;
    expect(
      Math.abs(totalFinalBalance - totalInitialBalance),
    ).toBeLessThanOrEqual(2);

    // Cleanup
    await accountAPI.deleteAccount(acc1Id);
    await accountAPI.deleteAccount(acc2Id);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("POST /transactions - base currency transaction without exchange fields", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const base = `mc-basecur-${Date.now()}`;
    const acc = await accountAPI.createAccount({
      name: `${base}-acc`,
      note: "base currency test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `${base}-cat`,
      note: "expense",
      type: "expense",
    });

    const accountId = acc.data!.id as number;
    const categoryId = cat.data!.id as number;
    const baseAmount = 500000; // 500k IDR

    // Act: Create transaction without currencyCode
    const createRes = await transactionAPI.createTransaction({
      type: "expense",
      date: new Date().toISOString(),
      amount: baseAmount,
      accountId,
      categoryId,
      note: "Base currency - no conversion",
    });

    // Assert
    expect(createRes.status).toBe(200);
    // Verify NO currency fields are populated (undefined when not set)
    expect(createRes.data!.amountForeign).toBeUndefined();
    expect(createRes.data!.currencyCode).toBeUndefined();
    expect(createRes.data!.exchangeRate).toBeUndefined();
    expect(createRes.data!.exchangeAt).toBeUndefined();

    // Verify amount is stored as-is
    expect(createRes.data!.amount).toBe(baseAmount);

    // Cleanup
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /transactions - retrieve multi-currency transaction with all fields", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const base = `mc-retrieve-${Date.now()}`;
    const acc = await accountAPI.createAccount({
      name: `${base}-acc`,
      note: "retrieval test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `${base}-cat`,
      note: "expense",
      type: "expense",
    });

    const accountId = acc.data!.id as number;
    const categoryId = cat.data!.id as number;

    // Act: Create transaction
    const createRes = await transactionAPI.createTransaction({
      type: "expense",
      date: new Date().toISOString(),
      amount: 75, // $75 USD
      currencyCode: "USD",
      accountId,
      categoryId,
      note: "USD retrieval test",
    });

    const txId = createRes.data!.id as number;

    // Act: Retrieve the transaction
    const getRes = await transactionAPI.getTransaction(txId);

    // Assert
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(txId);
    expect(getRes.data!.currencyCode).toBe("USD");
    expect(getRes.data!.amountForeign).toBe(75);
    expect(getRes.data!.exchangeRate).toBeDefined();
    expect(getRes.data!.exchangeAt).toBeDefined();
    expect(getRes.data!.amount).toBeGreaterThan(75); // Converted to IDR

    // Cleanup
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /transactions - filter transactions by currency code", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const base = `mc-filter-${Date.now()}`;
    const acc = await accountAPI.createAccount({
      name: `${base}-acc`,
      note: "filter test",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `${base}-cat`,
      note: "expense",
      type: "expense",
    });

    const accountId = acc.data!.id as number;
    const categoryId = cat.data!.id as number;

    // Act: Create multiple transactions in different currencies
    const currencies = ["USD", "EUR", "SGD"];
    for (const currency of currencies) {
      await transactionAPI.createTransaction({
        type: "expense",
        date: new Date().toISOString(),
        amount: 100,
        currencyCode: currency,
        accountId,
        categoryId,
        note: `Expense in ${currency}`,
      });
    }

    // Act: Filter by USD
    const listRes = await transactionAPI.getTransactions({
      accountId: [accountId],
      currencyCode: ["USD"],
    });

    // Assert
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    const usdOnly = items.filter((t: any) => t.currencyCode === "USD");

    expect(usdOnly.length).toBeGreaterThan(0);
    usdOnly.forEach((tx: any) => {
      expect(tx.currencyCode).toBe("USD");
      expect(tx.amountForeign).toBe(100);
      expect(tx.exchangeRate).toBeDefined();
    });

    // Cleanup
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Multi-Currency", () => {
  test("POST /transaction-templates - create template with currencyCode USD", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange: Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-multicurr-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-multicurr-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Act: Create template with USD currency code
    const templateData = {
      name: `USD Template ${Date.now()}`,
      amount: 100,
      currencyCode: "USD",
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "none" as const,
    };

    const res =
      await transactionTemplateAPI.createTransactionTemplate(templateData);

    // Assert: Template created with currencyCode
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.name).toBe(templateData.name);
    expect(res.data!.amount).toBe(templateData.amount);
    expect(res.data!.currencyCode).toBe("USD");
    const id = res.data!.id as number;

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - create template with multiple currency codes (EUR, SGD, JPY)", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Test multiple currency codes
    const currencies = ["EUR", "SGD", "JPY"];

    for (const currencyCode of currencies) {
      // Arrange
      const account = await accountAPI.createAccount({
        name: `tt-${currencyCode}-${Date.now()}`,
        note: "test account",
        type: "expense",
      });
      const category = await categoryAPI.createCategory({
        name: `tt-${currencyCode}-${Date.now()}`,
        note: "test category",
        type: "expense",
      });

      // Act
      const templateData = {
        name: `Template ${currencyCode} ${Date.now()}`,
        amount: 1000,
        currencyCode,
        type: "expense" as const,
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date().toISOString(),
        recurrence: "monthly" as const,
      };

      const res =
        await transactionTemplateAPI.createTransactionTemplate(templateData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.data!.currencyCode).toBe(currencyCode);
      expect(res.data!.amount).toBe(1000);

      // Cleanup
      const id = res.data!.id as number;
      await transactionTemplateAPI.deleteTransactionTemplate(id);
      await categoryAPI.deleteCategory(category.data!.id as number);
      await accountAPI.deleteAccount(account.data!.id as number);
    }
  });

  test("POST /transaction-templates - create template without currencyCode (defaults to base currency)", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `tt-nocc-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-nocc-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Act: Create without currencyCode
    const templateData = {
      name: `No Currency Template ${Date.now()}`,
      amount: 500000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "weekly" as const,
    };

    const res =
      await transactionTemplateAPI.createTransactionTemplate(templateData);

    // Assert: Should be created without currencyCode (null or undefined)
    expect(res.status).toBe(200);
    expect(res.data!.amount).toBe(500000);
    expect(res.data!.currencyCode).toBeFalsy(); // undefined or null is acceptable
    const id = res.data!.id as number;

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /transaction-templates/:id - update template currencyCode USD to EUR", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange: Create template with USD
    const account = await accountAPI.createAccount({
      name: `tt-update-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-update-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Update Test ${Date.now()}`,
      amount: 100,
      currencyCode: "USD",
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const id = created.data!.id as number;

    // Act: Update currencyCode to EUR
    const updateRes = await transactionTemplateAPI.updateTransactionTemplate(
      id,
      {
        currencyCode: "EUR",
      },
    );

    // Assert: CurrencyCode updated
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.currencyCode).toBe("EUR");
    expect(updateRes.data!.amount).toBe(100); // Amount unchanged

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /transaction-templates/:id - update both amount and currencyCode", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `tt-upd-both-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-upd-both-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Update Both ${Date.now()}`,
      amount: 50,
      currencyCode: "SGD",
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "none" as const,
    });
    const id = created.data!.id as number;

    // Act: Update both fields
    const updateRes = await transactionTemplateAPI.updateTransactionTemplate(
      id,
      {
        amount: 75,
        currencyCode: "JPY",
      },
    );

    // Assert
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.amount).toBe(75);
    expect(updateRes.data!.currencyCode).toBe("JPY");

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /transaction-templates/:id - update template name with currencyCode unchanged", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `tt-upd-name-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-upd-name-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Original Name ${Date.now()}`,
      amount: 200,
      currencyCode: "USD",
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "none" as const,
    });
    const id = created.data!.id as number;

    // Act: Update only name, verify currencyCode remains unchanged
    const updateRes = await transactionTemplateAPI.updateTransactionTemplate(
      id,
      {
        name: "Updated Name",
      },
    );

    // Assert
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe("Updated Name");
    expect(updateRes.data!.currencyCode).toBe("USD"); // CurrencyCode unchanged
    expect(updateRes.data!.amount).toBe(200); // Amount unchanged

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates/:id - verify template stores currencyCode as-is without conversion", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `tt-verify-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-verify-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const originalAmount = 100;
    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Verify Storage ${Date.now()}`,
      amount: originalAmount,
      currencyCode: "USD",
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "none" as const,
    });
    const id = created.data!.id as number;

    // Act: Fetch template
    const getRes = await transactionTemplateAPI.getTransactionTemplate(id);

    // Assert: Template stores original values (no conversion applied)
    expect(getRes.status).toBe(200);
    expect(getRes.data!.amount).toBe(originalAmount); // Amount unchanged
    expect(getRes.data!.currencyCode).toBe("USD");
    // Should NOT have amountForeign, exchangeRate, exchangeAt fields in response
    const responseData = getRes.data as any;
    expect(responseData.amountForeign).toBeUndefined();
    expect(responseData.exchangeRate).toBeUndefined();
    expect(responseData.exchangeAt).toBeUndefined();

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - template with currencyCode can be created with multiple recurrence patterns", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Test different recurrence patterns with multi-currency
    const recurrences = ["none", "weekly", "monthly", "yearly"] as const;

    for (const recurrence of recurrences) {
      // Arrange
      const account = await accountAPI.createAccount({
        name: `tt-rec-${recurrence}-${Date.now()}`,
        note: "test account",
        type: "expense",
      });
      const category = await categoryAPI.createCategory({
        name: `tt-rec-${recurrence}-${Date.now()}`,
        note: "test category",
        type: "expense",
      });

      // Act
      const templateData = {
        name: `Recurrence ${recurrence} ${Date.now()}`,
        amount: 500,
        currencyCode: "EUR",
        type: "income" as const,
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date().toISOString(),
        recurrence,
      };

      const res =
        await transactionTemplateAPI.createTransactionTemplate(templateData);

      // Assert
      expect(res.status).toBe(200);
      expect(res.data!.recurrence).toBe(recurrence);
      expect(res.data!.currencyCode).toBe("EUR");

      // Cleanup
      const id = res.data!.id as number;
      await transactionTemplateAPI.deleteTransactionTemplate(id);
      await categoryAPI.deleteCategory(category.data!.id as number);
      await accountAPI.deleteAccount(account.data!.id as number);
    }
  });

  test("POST /transaction-templates - multiple currencies with different amounts", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Test that amount and currencyCode are stored correctly (keepers pattern)
    const testCases = [
      { amount: 100, currencyCode: "USD" },
      { amount: 50, currencyCode: "EUR" },
      { amount: 1000, currencyCode: "JPY" },
    ];

    for (const testCase of testCases) {
      // Arrange
      const account = await accountAPI.createAccount({
        name: `tt-amounts-${testCase.currencyCode}-${Date.now()}`,
        note: "test account",
        type: "expense",
      });
      const category = await categoryAPI.createCategory({
        name: `tt-amounts-${testCase.currencyCode}-${Date.now()}`,
        note: "test category",
        type: "expense",
      });

      // Act
      const templateData = {
        name: `Amount Test ${testCase.currencyCode} ${Date.now()}`,
        amount: testCase.amount,
        currencyCode: testCase.currencyCode,
        type: "expense" as const,
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date().toISOString(),
        recurrence: "none" as const,
      };

      const res =
        await transactionTemplateAPI.createTransactionTemplate(templateData);

      // Assert: Verify template stores exact amounts (no conversion applied)
      const getRes = await transactionTemplateAPI.getTransactionTemplate(
        res.data!.id as number,
      );
      expect(getRes.data!.amount).toBe(testCase.amount);
      expect(getRes.data!.currencyCode).toBe(testCase.currencyCode);

      // Cleanup
      const id = res.data!.id as number;
      await transactionTemplateAPI.deleteTransactionTemplate(id);
      await categoryAPI.deleteCategory(category.data!.id as number);
      await accountAPI.deleteAccount(account.data!.id as number);
    }
  });
});

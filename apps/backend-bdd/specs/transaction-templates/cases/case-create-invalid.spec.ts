import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Create Invalid Cases", () => {
  test("POST /transaction-templates - missing required fields returns 400", async ({
    transactionTemplateAPI,
  }) => {
    const res = await transactionTemplateAPI.createTransactionTemplate(
      {} as any
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /transaction-templates - missing name returns 400", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `tt-invalid-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-invalid-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await transactionTemplateAPI.createTransactionTemplate({
      // name is missing
      note: "test",
      amount: 1000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    } as any);

    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - invalid amount types return 400", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `tt-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Test negative amount
    const negativeRes = await transactionTemplateAPI.createTransactionTemplate({
      name: "Negative Amount Template",
      note: "test",
      amount: -1000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });
    expect(negativeRes.status).toBeGreaterThanOrEqual(400);

    // Test zero amount
    const zeroRes = await transactionTemplateAPI.createTransactionTemplate({
      name: "Zero Amount Template",
      note: "test",
      amount: 0,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });
    expect(zeroRes.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - invalid type returns 400", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `tt-type-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-type-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await transactionTemplateAPI.createTransactionTemplate({
      name: "Invalid Type Template",
      note: "test",
      amount: 1000,
      type: "invalid_type",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    } as any);

    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - invalid recurrence returns 400", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `tt-freq-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-freq-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await transactionTemplateAPI.createTransactionTemplate({
      name: "Invalid Frequency Template",
      note: "test",
      amount: 1000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "invalid_recurrence",
    } as any);

    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - non-existent account returns 400", async ({
    transactionTemplateAPI,
    categoryAPI,
  }) => {
    const category = await categoryAPI.createCategory({
      name: `tt-no-account-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await transactionTemplateAPI.createTransactionTemplate({
      name: "No Account Template",
      note: "test",
      amount: 1000,
      type: "expense",
      accountId: 999999, // Non-existent account
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
  });

  test("POST /transaction-templates - non-existent category returns 400", async ({
    transactionTemplateAPI,
    accountAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `tt-no-category-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const res = await transactionTemplateAPI.createTransactionTemplate({
      name: "No Category Template",
      note: "test",
      amount: 1000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: 999999, // Non-existent category
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - invalid date format returns 400", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `tt-date-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-date-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await transactionTemplateAPI.createTransactionTemplate({
      name: "Invalid Date Template",
      note: "test",
      amount: 1000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: "invalid-date-format",
      recurrence: "monthly",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

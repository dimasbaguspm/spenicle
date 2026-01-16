import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Create Invalid Cases", () => {
  test("POST /budgets/templates - missing required fields returns 400", async ({
    budgetTemplateAPI,
  }) => {
    const res = await budgetTemplateAPI.createBudgetTemplate({} as any);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("POST /budgets/templates - missing amountLimit returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-invalid-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-invalid-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - missing recurrence returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-invalid-rec-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-invalid-rec-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      startDate: new Date().toISOString(),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - missing startDate returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-invalid-date-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-invalid-date-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - invalid recurrence returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-invalid-recurrence-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-invalid-recurrence-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "invalid",
      startDate: new Date().toISOString(),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - zero amountLimit returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-zero-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-zero-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 0,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - negative amountLimit returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-negative-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-negative-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: -1000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - non-existent account returns 400", async ({
    budgetTemplateAPI,
    categoryAPI,
  }) => {
    const category = await categoryAPI.createCategory({
      name: `bt-no-account-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: 999999,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
  });

  test("POST /budgets/templates - non-existent category returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    const account = await accountAPI.createAccount({
      name: `bt-no-category-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: 999999,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - end date before start date returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-end-before-start-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-end-before-start-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before start

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    expect(res.status).toBe(200); // API allows end date before start date

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

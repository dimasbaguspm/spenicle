import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Advanced Filtering", () => {
  test.beforeEach(async ({ budgetTemplateAPI }) => {
    // Clean up any existing templates to ensure test isolation
    const allTemplates = await budgetTemplateAPI.getBudgetTemplates();
    for (const template of allTemplates.data!.items || []) {
      await budgetTemplateAPI.deleteBudgetTemplate(template.id as number);
    }
  });
  test("GET /budgets/templates - filter by accountId", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account1 = await accountAPI.createAccount({
      name: `bt-filter-account1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });
    const account2 = await accountAPI.createAccount({
      name: `bt-filter-account2-${Date.now()}`,
      note: "test account 2",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-filter-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create budget templates
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account1.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 50000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account2.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 75000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
    });

    // Filter by account1
    const filtered = await budgetTemplateAPI.getBudgetTemplates({
      accountId: [account1.data!.id as number],
    });
    expect(filtered.status).toBe(200);
    expect(filtered.data!.items!.length).toBe(1);
    expect(filtered.data!.items![0].id).toBe(template1.data!.id);

    // Filter by account2
    const filtered2 = await budgetTemplateAPI.getBudgetTemplates({
      accountId: [account2.data!.id as number],
    });
    expect(filtered2.status).toBe(200);
    expect(filtered2.data!.items!.length).toBe(1);
    expect(filtered2.data!.items![0].id).toBe(template2.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template2.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
    await accountAPI.deleteAccount(account1.data!.id as number);
  });

  test("GET /budgets/templates - filter by categoryId", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-filter-cat-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category1 = await categoryAPI.createCategory({
      name: `bt-filter-category1-${Date.now()}`,
      note: "test category 1",
      type: "expense",
    });
    const category2 = await categoryAPI.createCategory({
      name: `bt-filter-category2-${Date.now()}`,
      note: "test category 2",
      type: "expense",
    });

    // Create budget templates
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category1.data!.id as number,
      amountLimit: 50000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category2.data!.id as number,
      amountLimit: 75000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
    });

    // Filter by category1
    const filtered = await budgetTemplateAPI.getBudgetTemplates({
      categoryId: [category1.data!.id as number],
    });
    expect(filtered.status).toBe(200);
    expect(filtered.data!.items!.length).toBe(1);
    expect(filtered.data!.items![0].id).toBe(template1.data!.id);

    // Filter by category2
    const filtered2 = await budgetTemplateAPI.getBudgetTemplates({
      categoryId: [category2.data!.id as number],
    });
    expect(filtered2.status).toBe(200);
    expect(filtered2.data!.items!.length).toBe(1);
    expect(filtered2.data!.items![0].id).toBe(template2.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template2.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template1.data!.id as number);
    await categoryAPI.deleteCategory(category2.data!.id as number);
    await categoryAPI.deleteCategory(category1.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/templates - filter by recurrence", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-filter-rec-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-filter-rec-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create budget templates with different recurrences
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 50000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 75000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
    });
    const template3 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "yearly",
      startDate: new Date().toISOString(),
    });

    // Filter by monthly
    const filteredMonthly = await budgetTemplateAPI.getBudgetTemplates({
      recurrence: "monthly",
    });
    expect(filteredMonthly.status).toBe(200);
    expect(filteredMonthly.data!.items!.length).toBe(1);
    expect(filteredMonthly.data!.items![0].id).toBe(template1.data!.id);

    // Filter by weekly
    const filteredWeekly = await budgetTemplateAPI.getBudgetTemplates({
      recurrence: "weekly",
    });
    expect(filteredWeekly.status).toBe(200);
    expect(filteredWeekly.data!.items!.length).toBe(1);
    expect(filteredWeekly.data!.items![0].id).toBe(template2.data!.id);

    // Filter by yearly
    const filteredYearly = await budgetTemplateAPI.getBudgetTemplates({
      recurrence: "yearly",
    });
    expect(filteredYearly.status).toBe(200);
    expect(filteredYearly.data!.items!.length).toBe(1);
    expect(filteredYearly.data!.items![0].id).toBe(template3.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template3.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template2.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/templates - combined filters", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account1 = await accountAPI.createAccount({
      name: `bt-combined-account1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });
    const account2 = await accountAPI.createAccount({
      name: `bt-combined-account2-${Date.now()}`,
      note: "test account 2",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-combined-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create budget templates
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account1.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 50000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account1.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 75000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
    });
    const template3 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account2.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 60000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Combined filter: account1 + monthly recurrence
    const filtered = await budgetTemplateAPI.getBudgetTemplates({
      accountId: [account1.data!.id as number],
      recurrence: "monthly",
    });
    expect(filtered.status).toBe(200);
    expect(filtered.data!.items!.length).toBe(1);
    expect(filtered.data!.items![0].id).toBe(template1.data!.id);

    // Combined filter: account1 + weekly recurrence
    const filtered2 = await budgetTemplateAPI.getBudgetTemplates({
      accountId: [account1.data!.id as number],
      recurrence: "weekly",
    });
    expect(filtered2.status).toBe(200);
    expect(filtered2.data!.items!.length).toBe(1);
    expect(filtered2.data!.items![0].id).toBe(template2.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template3.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template2.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
    await accountAPI.deleteAccount(account1.data!.id as number);
  });
});

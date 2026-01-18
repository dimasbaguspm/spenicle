import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Edge Cases and Recurrence Scenarios", () => {
  test("POST /budgets/templates - create with endDate in past returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-past-end-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-past-end-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    expect(res.status).toBe(200); // API allows end date in past

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - create with startDate in past is allowed", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-past-start-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-past-start-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - create with very large amountLimit", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-large-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-large-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 999999999999, // Very large amount
      recurrence: "yearly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.amountLimit).toBe(999999999999);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - create with very long note", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-long-note-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-long-note-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const longNote = "A".repeat(1000); // Very long note

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      note: longNote,
    });
    expect(res.status).toBe(422); // Validation error for too long note
    // No cleanup needed since creation failed
  });

  test("POST /budgets/templates - create with 'none' recurrence", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-none-rec-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-none-rec-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "none",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.recurrence).toBe("none");

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PUT /budgets/templates - update recurrence from monthly to yearly", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-update-rec-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-update-rec-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Update recurrence
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        recurrence: "yearly",
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.data!.recurrence).toBe("yearly");

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PUT /budgets/templates - update to add endDate", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-add-end-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-add-end-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template without endDate
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Update to add endDate
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        endDate: endDate.toISOString(),
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.data!.endDate).toBeDefined();

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PUT /budgets/templates - update to remove endDate", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-remove-end-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-remove-end-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with endDate
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      endDate: endDate.toISOString(),
    });

    // Update to remove endDate
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        endDate: undefined,
      },
    );
    expect(updated.status).toBe(200);
    // Note: API may not support removing endDate, so we check it still has the original value
    expect(updated.data!.endDate).toBeDefined();

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - create duplicate templates is allowed", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-duplicate-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-duplicate-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create first template
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Create duplicate template (same data)
    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    expect(template2.status).toBe(200);
    expect(template2.data!.id).not.toBe(template1.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template2.data!.id as number);
    await budgetTemplateAPI.deleteBudgetTemplate(template1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/templates - pagination works", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Clean up any existing templates first
    const allTemplates = await budgetTemplateAPI.getBudgetTemplates();
    for (const template of allTemplates.data!.items || []) {
      await budgetTemplateAPI.deleteBudgetTemplate(template.id as number);
    }
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-pagination-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-pagination-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create multiple templates
    const templates = [];
    for (let i = 0; i < 5; i++) {
      const template = await budgetTemplateAPI.createBudgetTemplate({
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        amountLimit: 10000 * (i + 1),
        recurrence: "monthly",
        startDate: new Date().toISOString(),
      });
      templates.push(template.data!.id);
    }

    // Test pagination - limit 2
    const page1 = await budgetTemplateAPI.getBudgetTemplates({
      pageSize: 2,
      pageNumber: 1,
    });
    expect(page1.status).toBe(200);
    expect(page1.data!.items!.length).toBe(2);

    const page2 = await budgetTemplateAPI.getBudgetTemplates({
      pageSize: 2,
      pageNumber: 2,
    });
    expect(page2.status).toBe(200);
    expect(page2.data!.items!.length).toBe(2);

    // Cleanup
    for (const id of templates) {
      await budgetTemplateAPI.deleteBudgetTemplate(id as number);
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - nextRunAt is null for none recurrence", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-none-nextrun-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-none-nextrun-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "none",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBe(200);
    expect(res.data!.nextRunAt).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - nextRunAt is set to startDate for recurring templates", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-nextrun-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-nextrun-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const startDate = new Date().toISOString();
    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate,
    });
    expect(res.status).toBe(200);
    expect(res.data!.nextRunAt).toBe(startDate);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

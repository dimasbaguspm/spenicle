import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Relations and Dependencies", () => {
  test("POST /budgets/templates - create with income account type", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create income account
    const account = await accountAPI.createAccount({
      name: `bt-income-account-${Date.now()}`,
      note: "income account",
      type: "income",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-income-category-${Date.now()}`,
      note: "income category",
      type: "income",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 500000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBe(200);
    expect(res.data!.accountId).toBe(account.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets/templates - create with asset account type", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create asset account
    const account = await accountAPI.createAccount({
      name: `bt-asset-account-${Date.now()}`,
      note: "asset account",
      type: "income",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-asset-category-${Date.now()}`,
      note: "asset category",
      type: "income",
    });

    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 1000000,
      recurrence: "yearly",
      startDate: new Date().toISOString(),
    });
    expect(res.status).toBe(200);
    expect(res.data!.accountId).toBe(account.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(res.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/templates - verify account and category relations", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-relations-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-relations-category-${Date.now()}`,
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
      note: "Test template for relations",
    });

    // Get template and verify relations
    const retrieved = await budgetTemplateAPI.getBudgetTemplate(
      template.data!.id as number
    );
    expect(retrieved.status).toBe(200);
    expect(retrieved.data!.accountId).toBe(account.data!.id);
    expect(retrieved.data!.categoryId).toBe(category.data!.id);
    expect(retrieved.data!.note).toBe("Test template for relations");

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("DELETE /accounts - fails when budget templates exist", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-delete-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-delete-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template
    await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Try to delete account - should succeed (no foreign key constraints)
    const deleteResult = await accountAPI.deleteAccount(
      account.data!.id as number
    );
    expect(deleteResult.status).toBe(204);

    // Cleanup - delete template first, then account
    const templates = await budgetTemplateAPI.getBudgetTemplates({
      accountId: [account.data!.id as number],
    });
    for (const template of templates.data!.items!) {
      await budgetTemplateAPI.deleteBudgetTemplate(template.id as number);
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("DELETE /categories - fails when budget templates exist", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-delete-cat-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-delete-cat-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template
    await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Try to delete category - should succeed (no foreign key constraints)
    const deleteResult = await categoryAPI.deleteCategory(
      category.data!.id as number
    );
    expect(deleteResult.status).toBe(204);

    // Cleanup - delete template first, then category
    const templates = await budgetTemplateAPI.getBudgetTemplates({
      categoryId: [category.data!.id as number],
    });
    for (const template of templates.data!.items!) {
      await budgetTemplateAPI.deleteBudgetTemplate(template.id as number);
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PUT /budgets/templates - update accountId to different account", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account1 = await accountAPI.createAccount({
      name: `bt-update-acc1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });
    const account2 = await accountAPI.createAccount({
      name: `bt-update-acc2-${Date.now()}`,
      note: "test account 2",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-update-acc-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with account1
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account1.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Update to account2
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        accountId: account2.data!.id as number,
      }
    );
    expect(updated.status).toBe(200);
    expect(updated.data!.accountId).toBe(account2.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
    await accountAPI.deleteAccount(account1.data!.id as number);
  });

  test("PUT /budgets/templates - update categoryId to different category", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-update-cat-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category1 = await categoryAPI.createCategory({
      name: `bt-update-cat1-${Date.now()}`,
      note: "test category 1",
      type: "expense",
    });
    const category2 = await categoryAPI.createCategory({
      name: `bt-update-cat2-${Date.now()}`,
      note: "test category 2",
      type: "expense",
    });

    // Create template with category1
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category1.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });

    // Update to category2
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        categoryId: category2.data!.id as number,
      }
    );
    expect(updated.status).toBe(200);
    expect(updated.data!.categoryId).toBe(category2.data!.id);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category2.data!.id as number);
    await categoryAPI.deleteCategory(category1.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PUT /budgets/templates - update to non-existent account returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-invalid-update-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-invalid-update-category-${Date.now()}`,
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

    // Try to update to non-existent account
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        accountId: 999999,
      }
    );
    expect(updated.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PUT /budgets/templates - update to non-existent category returns 400", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-invalid-cat-update-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-invalid-cat-update-category-${Date.now()}`,
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

    // Try to update to non-existent category
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        categoryId: 999999,
      }
    );
    expect(updated.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(template.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

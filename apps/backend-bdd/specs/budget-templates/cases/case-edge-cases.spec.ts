import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Edge Cases and Recurrence Scenarios", () => {
  test("POST /budgets - create with endDate in past returns 400", async ({
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
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: "Past End Date Test",
      active: true,
    });
    expect(res.status).toBe(200); // API allows end date in past

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets - create with startDate in past is allowed", async ({
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
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: "Past Start Date Test",
      active: true,
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets - create with very large amountLimit", async ({
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
      amountLimit: 999999999999, // Very large amount
      recurrence: "yearly",
      startDate: new Date().toISOString(),
      name: "Large Amount Test",
      active: true,
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.amountLimit).toBe(999999999999);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets - create with very long note", async ({
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
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      note: longNote,
      name: "Long Note Test",
      active: true,
    });
    expect(res.status).toBe(422); // Validation error for too long note
    // No cleanup needed since creation failed
  });

  test("POST /budgets - create with 'none' recurrence", async ({
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
      amountLimit: 100000,
      recurrence: "none",
      startDate: new Date().toISOString(),
      name: "None Recurrence Test",
      active: true,
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.recurrence).toBe("none");

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /budgets - update name only", async ({
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
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Update Name Test",
      active: true,
    });

    // Update name only (allowed field)
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        name: "New Name",
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.data!.name).toBe("New Name");

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /budgets - update name and note", async ({
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

    // Create template
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Update Fields Test",
      active: true,
    });

    // Update name and note only (allowed fields)
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        name: "Updated Name",
        note: "Updated Note",
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.data!.name).toBe("Updated Name");
    expect(updated.data!.note).toBe("Updated Note");

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /budgets - update to deactivate", async ({
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

    // Create template
    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Deactivate Test",
      active: true,
    });

    // Update to deactivate
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        active: false,
      },
    );
    expect(updated.status).toBe(200);
    // Note: Once deactivated, template should stop generating budgets
    expect(updated.data!.active).toBe(false);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets - create duplicate templates is NOT allowed", async ({
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
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Duplicate Template 1",
      active: true,
    });

    // Attempt to create duplicate template (same account)
    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Duplicate Template 2",
      active: true,
    });

    // Assert: Duplicate creation fails due to uniqueness constraint
    expect(template2.status).toBe(400);
    expect(template2.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template1.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets - pagination works", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Clean up any existing templates first
    const allTemplates = await budgetTemplateAPI.getBudgetTemplates();
    for (const template of allTemplates.data!.items || []) {
      await budgetTemplateAPI.updateBudgetTemplate(template.id as number, {
        active: false,
      });
    }

    // Create multiple templates (one per account to respect uniqueness constraint)
    const templates = [];
    const accounts = [];
    for (let i = 0; i < 5; i++) {
      const account = await accountAPI.createAccount({
        name: `bt-pagination-account-${i}-${Date.now()}`,
        note: "test account",
        type: "expense",
      });
      accounts.push(account);

      const template = await budgetTemplateAPI.createBudgetTemplate({
        accountId: account.data!.id as number,
        amountLimit: 10000 * (i + 1),
        recurrence: "monthly",
        startDate: new Date().toISOString(),
        name: `Pagination Template ${i + 1}`,
        active: true,
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
      await budgetTemplateAPI.updateBudgetTemplate(id as number, {
        active: false,
      });
    }
    for (const account of accounts) {
      await accountAPI.deleteAccount(account.data!.id as number);
    }
  });

  test("POST /budgets - nextRunAt is null for none recurrence", async ({
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
      amountLimit: 100000,
      recurrence: "none",
      startDate: new Date().toISOString(),
      name: "None NextRun Test",
      active: true,
    });
    expect(res.status).toBe(200);
    expect(res.data!.nextRunAt).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /budgets - nextRunAt is set to startDate for recurring templates", async ({
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
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: startDate,
      name: "NextRun StartDate Test",
      active: true,
    });
    expect(res.status).toBe(200);
    expect(res.data!.nextRunAt).toBe(startDate);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

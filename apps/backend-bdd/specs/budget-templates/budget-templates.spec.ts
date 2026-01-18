import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Common CRUD", () => {
  test("POST /budgets/templates - create budget template", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const startDate = new Date().toISOString();
    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000, // $1000.00
      recurrence: "monthly",
      startDate: startDate,
      note: "create test",
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.nextRunAt).toBeDefined();
    expect(res.data!.nextRunAt).toBe(startDate); // Initially set to startDate
    const id = res.data!.id as number;

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/templates - list budget templates returns items", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-list-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-list-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create a budget template
    const created = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 50000, // $500.00
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      note: "list test",
    });
    const id = created.data!.id as number;

    const listRes = await budgetTemplateAPI.getBudgetTemplates();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/templates/:id - get budget template by id", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-get-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-get-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create a budget template
    const created = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 75000, // $750.00
      recurrence: "yearly",
      startDate: new Date().toISOString(),
      note: "get test",
    });
    const id = created.data!.id as number;

    const getRes = await budgetTemplateAPI.getBudgetTemplate(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);
    expect(getRes.data!.amountLimit).toBe(75000);
    expect(getRes.data!.recurrence).toBe("yearly");

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /budgets/templates/:id - update budget template", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-update-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-update-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create a budget template
    const created = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000, // $1000.00
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      note: "update test",
    });
    const id = created.data!.id as number;

    // Update the template
    const newAmount = 150000; // $1500.00
    const updateRes = await budgetTemplateAPI.updateBudgetTemplate(id, {
      amountLimit: newAmount,
      note: "updated note",
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.amountLimit).toBe(newAmount);
    expect(updateRes.data!.note).toBe("updated note");

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("DELETE /budgets/templates/:id - delete budget template", async ({
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

    // Create a budget template
    const created = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 200000, // $2000.00
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      note: "delete test",
    });
    const templateId = created.data!.id as number;

    // Delete the template
    const delRes = await budgetTemplateAPI.deleteBudgetTemplate(templateId);
    expect([200, 204]).toContain(delRes.status);

    // Verify it's gone
    const afterGet = await budgetTemplateAPI.getBudgetTemplate(templateId);
    expect(afterGet.status).toBe(404);

    // Cleanup dependencies
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

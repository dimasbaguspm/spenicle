import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Common CRUD", () => {
  test("POST /budgets - create budget template", async ({
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
      // categoryId: category.data!.id as number, // Removed - cannot have both account and category
      amountLimit: 100000, // $1000.00
      recurrence: "monthly",
      startDate: startDate,
      name: "Monthly Budget Template",
      note: "create test",
      active: true,
    });

    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.nextRunAt).toBeDefined();
    expect(res.data!.nextRunAt).toBe(startDate); // Initially set to startDate
    const id = res.data!.id as number;

    // Cleanup - deactivate instead of delete
    await budgetTemplateAPI.updateBudgetTemplate(id, { active: false });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets - list budget templates returns items", async ({
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
      // categoryId: category.data!.id as number, // Removed - cannot have both
      amountLimit: 50000, // $500.00
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "Weekly Budget Template",
      note: "list test",
      active: true,
    });
    const id = created.data!.id as number;

    const listRes = await budgetTemplateAPI.getBudgetTemplates();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);

    // Cleanup - deactivate instead of delete
    await budgetTemplateAPI.updateBudgetTemplate(id, { active: false });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets/:id - get budget template by id", async ({
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
      // categoryId: category.data!.id as number, // Removed - cannot have both
      amountLimit: 75000, // $750.00
      recurrence: "yearly",
      startDate: new Date().toISOString(),
      name: "Yearly Budget Template",
      note: "get test",
      active: true,
    });
    const id = created.data!.id as number;

    const getRes = await budgetTemplateAPI.getBudgetTemplate(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);
    expect(getRes.data!.amountLimit).toBe(75000);
    expect(getRes.data!.recurrence).toBe("yearly");

    // Cleanup - deactivate instead of delete
    await budgetTemplateAPI.updateBudgetTemplate(id, { active: false });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /budgets/:id - update budget template", async ({
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
      // categoryId: category.data!.id as number, // Removed - cannot have both
      amountLimit: 100000, // $1000.00
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Monthly Update Test Template",
      note: "update test",
      active: true,
    });
    const id = created.data!.id as number;

    // Update the template
    const updateRes = await budgetTemplateAPI.updateBudgetTemplate(id, {
      name: "Updated Template Name",
      note: "updated note",
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe("Updated Template Name");
    expect(updateRes.data!.note).toBe("updated note");

    // Cleanup - deactivate instead of delete
    await budgetTemplateAPI.updateBudgetTemplate(id, { active: false });
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

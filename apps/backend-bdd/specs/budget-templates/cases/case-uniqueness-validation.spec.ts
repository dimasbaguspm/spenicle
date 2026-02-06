import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Uniqueness Validation", () => {
  test("should create first template for account successfully", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account
    const account = await accountAPI.createAccount({
      name: `unique-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    // Act: Create budget template for account
    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "First Account Template",
      active: true,
    });

    // Assert: Template created successfully
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.id).toBeDefined();
    expect(res.data!.accountId).toBe(account.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to create duplicate active template for same account", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and first template
    const account = await accountAPI.createAccount({
      name: `duplicate-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const firstTemplate = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "First Template",
      active: true,
    });

    // Act: Attempt to create duplicate template for same account
    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 200000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "Duplicate Template",
      active: true,
    });

    // Assert: Duplicate creation fails
    expect(res.status).toBe(400);
    expect(res.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(
      firstTemplate.data!.id as number,
      { active: false },
    );
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to create template when inactive template exists for account", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account, create template, then deactivate it
    const account = await accountAPI.createAccount({
      name: `inactive-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const firstTemplate = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "First Template",
      active: true,
    });

    // Deactivate the first template
    await budgetTemplateAPI.updateBudgetTemplate(
      firstTemplate.data!.id as number,
      { active: false },
    );

    // Act: Attempt to create new template for same account
    const res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 200000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "New Template",
      active: true,
    });

    // Assert: Creation fails because uniqueness applies to ALL templates (active and inactive)
    expect(res.status).toBe(400);
    expect(res.data).toBeUndefined();

    // Cleanup
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should create first template for category successfully", async ({
    budgetTemplateAPI,
    categoryAPI,
  }) => {
    // Arrange: Create category
    const category = await categoryAPI.createCategory({
      name: `unique-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Act: Create budget template for category
    const res = await budgetTemplateAPI.createBudgetTemplate({
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "First Category Template",
      active: true,
    });

    // Assert: Template created successfully
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.id).toBeDefined();
    expect(res.data!.categoryId).toBe(category.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(res.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category.data!.id as number);
  });

  test("should fail to create duplicate template for same category", async ({
    budgetTemplateAPI,
    categoryAPI,
  }) => {
    // Arrange: Create category and first template
    const category = await categoryAPI.createCategory({
      name: `duplicate-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const firstTemplate = await budgetTemplateAPI.createBudgetTemplate({
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "First Template",
      active: true,
    });

    // Act: Attempt to create duplicate template for same category
    const res = await budgetTemplateAPI.createBudgetTemplate({
      categoryId: category.data!.id as number,
      amountLimit: 200000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "Duplicate Template",
      active: true,
    });

    // Assert: Duplicate creation fails
    expect(res.status).toBe(400);
    expect(res.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(
      firstTemplate.data!.id as number,
      { active: false },
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
  });

  test("should create templates for different accounts successfully", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create two different accounts
    const account1 = await accountAPI.createAccount({
      name: `different-account-1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });

    const account2 = await accountAPI.createAccount({
      name: `different-account-2-${Date.now()}`,
      note: "test account 2",
      type: "expense",
    });

    // Act: Create templates for both accounts
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account1.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template 1",
      active: true,
    });

    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account2.data!.id as number,
      amountLimit: 200000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "Template 2",
      active: true,
    });

    // Assert: Both templates created successfully
    expect(template1.status).toBe(200);
    expect(template1.data!.accountId).toBe(account1.data!.id);
    expect(template2.status).toBe(200);
    expect(template2.data!.accountId).toBe(account2.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template1.data!.id as number, {
      active: false,
    });
    await budgetTemplateAPI.updateBudgetTemplate(template2.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account1.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
  });

  test("should create templates for different categories successfully", async ({
    budgetTemplateAPI,
    categoryAPI,
  }) => {
    // Arrange: Create two different categories
    const category1 = await categoryAPI.createCategory({
      name: `different-category-1-${Date.now()}`,
      note: "test category 1",
      type: "expense",
    });

    const category2 = await categoryAPI.createCategory({
      name: `different-category-2-${Date.now()}`,
      note: "test category 2",
      type: "expense",
    });

    // Act: Create templates for both categories
    const template1 = await budgetTemplateAPI.createBudgetTemplate({
      categoryId: category1.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template 1",
      active: true,
    });

    const template2 = await budgetTemplateAPI.createBudgetTemplate({
      categoryId: category2.data!.id as number,
      amountLimit: 200000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "Template 2",
      active: true,
    });

    // Assert: Both templates created successfully
    expect(template1.status).toBe(200);
    expect(template1.data!.categoryId).toBe(category1.data!.id);
    expect(template2.status).toBe(200);
    expect(template2.data!.categoryId).toBe(category2.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template1.data!.id as number, {
      active: false,
    });
    await budgetTemplateAPI.updateBudgetTemplate(template2.data!.id as number, {
      active: false,
    });
    await categoryAPI.deleteCategory(category1.data!.id as number);
    await categoryAPI.deleteCategory(category2.data!.id as number);
  });

  test("should allow separate templates for account and category namespaces", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Arrange: Create account and category
    const account = await accountAPI.createAccount({
      name: `namespace-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const category = await categoryAPI.createCategory({
      name: `namespace-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Act: Create templates for both account and category
    const accountTemplate = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Account Template",
      active: true,
    });

    const categoryTemplate = await budgetTemplateAPI.createBudgetTemplate({
      categoryId: category.data!.id as number,
      amountLimit: 200000,
      recurrence: "weekly",
      startDate: new Date().toISOString(),
      name: "Category Template",
      active: true,
    });

    // Assert: Both templates created successfully (separate namespaces)
    expect(accountTemplate.status).toBe(200);
    expect(accountTemplate.data!.accountId).toBe(account.data!.id);
    expect(categoryTemplate.status).toBe(200);
    expect(categoryTemplate.data!.categoryId).toBe(category.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(
      accountTemplate.data!.id as number,
      { active: false },
    );
    await budgetTemplateAPI.updateBudgetTemplate(
      categoryTemplate.data!.id as number,
      { active: false },
    );
    await accountAPI.deleteAccount(account.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
  });
});

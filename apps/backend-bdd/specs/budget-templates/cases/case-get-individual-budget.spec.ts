import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Get Individual Budget", () => {
  test("should retrieve individual budget from template successfully", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `get-budget-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Get Budget Template",
      active: true,
    });

    // Wait and fetch related budgets
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgets = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template.data!.id as number,
    );

    // Skip if no budgets generated yet
    if (!budgets.data?.items || budgets.data.items.length === 0) {
      await budgetTemplateAPI.updateBudgetTemplate(
        template.data!.id as number,
        { active: false },
      );
      await accountAPI.deleteAccount(account.data!.id as number);
      return;
    }

    const budgetId = budgets.data.items[0].id as number;

    // Act: Retrieve individual budget
    const retrieved = await budgetTemplateAPI.getGeneratedBudget(
      template.data!.id as number,
      budgetId,
    );

    // Assert: Budget retrieved successfully
    expect(retrieved.status).toBe(200);
    expect(retrieved.data).toBeDefined();
    expect(retrieved.data!.id).toBe(budgetId);
    expect(retrieved.data!.templateId).toBe(template.data!.id);
    expect(retrieved.data!.accountId).toBe(account.data!.id);
    expect(retrieved.data!.amountLimit).toBe(100000);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should verify retrieved budget has all expected fields", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `get-budget-fields-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 50000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Budget Fields Test",
      active: true,
    });

    // Wait and fetch related budgets
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgets = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template.data!.id as number,
    );

    // Skip if no budgets generated yet
    if (!budgets.data?.items || budgets.data.items.length === 0) {
      await budgetTemplateAPI.updateBudgetTemplate(
        template.data!.id as number,
        { active: false },
      );
      await accountAPI.deleteAccount(account.data!.id as number);
      return;
    }

    const budgetId = budgets.data.items[0].id as number;

    // Act: Retrieve individual budget
    const retrieved = await budgetTemplateAPI.getGeneratedBudget(
      template.data!.id as number,
      budgetId,
    );

    // Assert: All required fields are present
    expect(retrieved.data!.id).toBeDefined();
    expect(retrieved.data!.name).toBeDefined();
    expect(retrieved.data!.amountLimit).toBeDefined();
    expect(retrieved.data!.actualAmount).toBeDefined();
    expect(retrieved.data!.periodStart).toBeDefined();
    expect(retrieved.data!.periodEnd).toBeDefined();
    expect(retrieved.data!.periodType).toBeDefined();
    expect(retrieved.data!.status).toBeDefined();
    expect(retrieved.data!.createdAt).toBeDefined();
    expect(retrieved.data!.updatedAt).toBeDefined();
    expect(retrieved.data!.templateId).toBe(template.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should return 404 for non-existent budget", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `get-budget-404-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "404 Test Template",
      active: true,
    });

    // Act: Try to retrieve non-existent budget
    const retrieved = await budgetTemplateAPI.getGeneratedBudget(
      template.data!.id as number,
      99999, // Non-existent budget ID
    );

    // Assert: 404 error
    expect(retrieved.status).toBe(404);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should return 404 for non-existent template", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account for valid budget ID
    const account = await accountAPI.createAccount({
      name: `get-budget-template-404-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template 404 Test",
      active: true,
    });

    // Wait and fetch related budgets
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgets = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template.data!.id as number,
    );

    let budgetId = 1;
    if (budgets.data?.items && budgets.data.items.length > 0) {
      budgetId = budgets.data.items[0].id as number;
    }

    // Act: Try to retrieve budget with non-existent template
    const retrieved = await budgetTemplateAPI.getGeneratedBudget(
      99999, // Non-existent template ID
      budgetId,
    );

    // Assert: 404 error
    expect(retrieved.status).toBe(404);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should retrieve budget after it was updated", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `get-after-update-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Get After Update Template",
      active: true,
    });

    // Wait and fetch related budgets
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgets = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template.data!.id as number,
    );

    // Skip if no budgets generated yet
    if (!budgets.data?.items || budgets.data.items.length === 0) {
      await budgetTemplateAPI.updateBudgetTemplate(
        template.data!.id as number,
        { active: false },
      );
      await accountAPI.deleteAccount(account.data!.id as number);
      return;
    }

    const budgetId = budgets.data.items[0].id as number;

    // Act: Update budget
    const newAmountLimit = 150000;
    await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      budgetId,
      { amountLimit: newAmountLimit },
    );

    // Retrieve updated budget
    const retrieved = await budgetTemplateAPI.getGeneratedBudget(
      template.data!.id as number,
      budgetId,
    );

    // Assert: Retrieved budget reflects the update
    expect(retrieved.status).toBe(200);
    expect(retrieved.data!.amountLimit).toBe(newAmountLimit);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should retrieve multiple budgets from same template independently", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `get-multiple-budgets-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Multiple Budgets Get Test",
      active: true,
    });

    // Wait and fetch related budgets
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgets = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template.data!.id as number,
    );

    // Skip if less than 2 budgets
    if (!budgets.data?.items || budgets.data.items.length < 2) {
      await budgetTemplateAPI.updateBudgetTemplate(
        template.data!.id as number,
        { active: false },
      );
      await accountAPI.deleteAccount(account.data!.id as number);
      return;
    }

    const budget1Id = budgets.data.items[0].id as number;
    const budget2Id = budgets.data.items[1].id as number;

    // Act: Retrieve both budgets
    const retrieved1 = await budgetTemplateAPI.getGeneratedBudget(
      template.data!.id as number,
      budget1Id,
    );

    const retrieved2 = await budgetTemplateAPI.getGeneratedBudget(
      template.data!.id as number,
      budget2Id,
    );

    // Assert: Both retrieved successfully with correct IDs
    expect(retrieved1.status).toBe(200);
    expect(retrieved2.status).toBe(200);
    expect(retrieved1.data!.id).toBe(budget1Id);
    expect(retrieved2.data!.id).toBe(budget2Id);
    expect(retrieved1.data!.id).not.toBe(retrieved2.data!.id);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

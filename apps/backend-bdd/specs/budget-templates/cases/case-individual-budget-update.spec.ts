import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Individual Budget Updates", () => {
  test("should update individual budget amountLimit successfully", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `budget-update-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Budget Update Template",
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

    // Act: Update individual budget amountLimit
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      budgetId,
      { amountLimit: 150000 },
    );

    // Assert: Budget updated successfully
    expect(updated.status).toBe(200);
    expect(updated.data!.amountLimit).toBe(150000);
    expect(updated.data!.id).toBe(budgetId);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should verify budget update doesn't affect template", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `isolation-template-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Isolation Template Test",
      active: true,
    });

    const originalTemplateAmount = template.data!.amountLimit;

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

    // Act: Update individual budget
    await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      budgetId,
      { amountLimit: 200000 },
    );

    // Fetch template again to verify it's unchanged
    const templateAfter = await budgetTemplateAPI.getBudgetTemplate(
      template.data!.id as number,
    );

    // Assert: Template unchanged
    expect(templateAfter.status).toBe(200);
    expect(templateAfter.data!.amountLimit).toBe(originalTemplateAmount);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should verify budget update doesn't affect other budgets from same template", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `isolation-budgets-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Multiple Budgets Template",
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

    const firstBudgetId = budgets.data.items[0].id as number;
    const secondBudgetOriginalAmount = budgets.data.items[1].amountLimit;

    // Act: Update only the first budget
    await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      firstBudgetId,
      { amountLimit: 250000 },
    );

    // Fetch budgets again
    const budgetsAfter =
      await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
        template.data!.id as number,
      );

    // Assert: Other budgets unchanged
    const secondBudgetAfter = budgetsAfter.data!.items!.find(
      (b) => b.id === budgets.data!.items![1].id,
    );
    expect(secondBudgetAfter!.amountLimit).toBe(secondBudgetOriginalAmount);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update budget without amountLimit field", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `missing-field-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Required Field Template",
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

    // Act: Attempt to update without amountLimit field
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      budgetId,
      {} as any,
    );

    // Assert: Bad request error
    expect(updated.status).toBe(400);
    expect(updated.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update budget with amountLimit=0", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `zero-budget-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Zero Amount Template",
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

    // Act: Attempt to update with amountLimit=0
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      budgetId,
      { amountLimit: 0 },
    );

    // Assert: Validation error
    expect(updated.status).toBe(422);
    expect(updated.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update budget with negative amountLimit", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `negative-budget-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Negative Amount Template",
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

    // Act: Attempt to update with negative amountLimit
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      budgetId,
      { amountLimit: -50000 },
    );

    // Assert: Validation error
    expect(updated.status).toBe(422);
    expect(updated.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update with invalid template ID", async ({
    budgetTemplateAPI,
  }) => {
    // Act: Attempt to update with non-existent template ID
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      999999,
      1,
      { amountLimit: 100000 },
    );

    // Assert: Not found error
    expect(updated.status).toBe(404);
    expect(updated.data).toBeUndefined();
  });

  test("should fail to update with invalid budget ID", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `invalid-budget-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Invalid Budget ID Template",
      active: true,
    });

    // Act: Attempt to update with non-existent budget ID
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      template.data!.id as number,
      999999,
      { amountLimit: 100000 },
    );

    // Assert: Not found error
    expect(updated.status).toBe(404);
    expect(updated.data).toBeUndefined();

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update budget with mismatched template ID", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create two accounts and templates
    const account1 = await accountAPI.createAccount({
      name: `mismatch-account-1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });

    const account2 = await accountAPI.createAccount({
      name: `mismatch-account-2-${Date.now()}`,
      note: "test account 2",
      type: "expense",
    });

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
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template 2",
      active: true,
    });

    // Wait and fetch budgets from template1
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgets1 = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template1.data!.id as number,
    );

    // Skip if no budgets generated yet
    if (!budgets1.data?.items || budgets1.data.items.length === 0) {
      await budgetTemplateAPI.updateBudgetTemplate(
        template1.data!.id as number,
        { active: false },
      );
      await budgetTemplateAPI.updateBudgetTemplate(
        template2.data!.id as number,
        { active: false },
      );
      await accountAPI.deleteAccount(account1.data!.id as number);
      await accountAPI.deleteAccount(account2.data!.id as number);
      return;
    }

    const budget1Id = budgets1.data.items[0].id as number;

    // Act: Attempt to update budget1 using template2 ID (mismatch)
    const updated = await budgetTemplateAPI.updateBudgetFromTemplate(
      template2.data!.id as number,
      budget1Id,
      { amountLimit: 300000 },
    );

    // Assert: Not found error (budget doesn't belong to template2)
    expect(updated.status).toBe(404);
    expect(updated.data).toBeUndefined();

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
});

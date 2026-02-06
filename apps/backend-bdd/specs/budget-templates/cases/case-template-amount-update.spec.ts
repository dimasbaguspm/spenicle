import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Template AmountLimit Updates", () => {
  test("should update amountLimit only", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `update-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Original Template",
      note: "original note",
      active: true,
    });

    // Act: Update only amountLimit
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        amountLimit: 200000,
      },
    );

    // Assert: amountLimit updated, other fields unchanged
    expect(updated.status).toBe(200);
    expect(updated.data!.amountLimit).toBe(200000);
    expect(updated.data!.name).toBe("Original Template");
    expect(updated.data!.note).toBe("original note");

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should update amountLimit and name together", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `update-multi-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Original Template",
      note: "original note",
      active: true,
    });

    // Act: Update amountLimit and name
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        amountLimit: 300000,
        name: "Updated Template",
      },
    );

    // Assert: Both fields updated
    expect(updated.status).toBe(200);
    expect(updated.data!.amountLimit).toBe(300000);
    expect(updated.data!.name).toBe("Updated Template");
    expect(updated.data!.note).toBe("original note"); // Unchanged

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should update all allowed fields including amountLimit", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `update-all-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Original Template",
      note: "original note",
      active: true,
    });

    // Act: Update all fields
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        amountLimit: 400000,
        name: "Fully Updated Template",
        note: "updated note",
        active: false,
      },
    );

    // Assert: All fields updated
    expect(updated.status).toBe(200);
    expect(updated.data!.amountLimit).toBe(400000);
    expect(updated.data!.name).toBe("Fully Updated Template");
    expect(updated.data!.note).toBe("updated note");
    expect(updated.data!.active).toBe(false);

    // Cleanup
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update with amountLimit=0", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `zero-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template",
      active: true,
    });

    // Act: Attempt to update with amountLimit=0
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        amountLimit: 0,
      },
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

  test("should fail to update with negative amountLimit", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `negative-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template",
      active: true,
    });

    // Act: Attempt to update with negative amountLimit
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        amountLimit: -50000,
      },
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

  test("should update to very large amountLimit successfully", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `large-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Template",
      active: true,
    });

    // Act: Update to very large amountLimit
    const largeAmount = 999999999;
    const updated = await budgetTemplateAPI.updateBudgetTemplate(
      template.data!.id as number,
      {
        amountLimit: largeAmount,
      },
    );

    // Assert: Update successful
    expect(updated.status).toBe(200);
    expect(updated.data!.amountLimit).toBe(largeAmount);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should fail to update non-existent template", async ({
    budgetTemplateAPI,
  }) => {
    // Act: Attempt to update non-existent template
    const updated = await budgetTemplateAPI.updateBudgetTemplate(999999, {
      amountLimit: 100000,
    });

    // Assert: Not found error
    expect(updated.status).toBe(404);
    expect(updated.data).toBeUndefined();
  });

  test("should verify template update doesn't affect existing budgets", async ({
    budgetTemplateAPI,
    accountAPI,
  }) => {
    // Arrange: Create account and template
    const account = await accountAPI.createAccount({
      name: `isolation-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
      name: "Isolation Test Template",
      active: true,
    });

    // Wait a bit and fetch related budgets (may be empty if worker hasn't run)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const budgetsBefore =
      await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
        template.data!.id as number,
      );

    // If no budgets exist yet, skip the isolation test
    if (!budgetsBefore.data?.items || budgetsBefore.data.items.length === 0) {
      // Cleanup and skip
      await budgetTemplateAPI.updateBudgetTemplate(
        template.data!.id as number,
        { active: false },
      );
      await accountAPI.deleteAccount(account.data!.id as number);
      return;
    }

    const originalBudgetAmount = budgetsBefore.data.items[0].amountLimit;

    // Act: Update template amountLimit
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      amountLimit: 200000,
    });

    // Fetch budgets again
    const budgetsAfter =
      await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
        template.data!.id as number,
      );

    // Assert: Existing budgets unchanged
    expect(budgetsAfter.status).toBe(200);
    expect(budgetsAfter.data!.items![0].amountLimit).toBe(originalBudgetAmount);

    // Cleanup
    await budgetTemplateAPI.updateBudgetTemplate(template.data!.id as number, {
      active: false,
    });
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

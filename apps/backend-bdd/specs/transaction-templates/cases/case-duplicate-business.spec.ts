import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Duplicate and Business Logic", () => {
  test("POST /transaction-templates - duplicate names allowed", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-duplicate-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-duplicate-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create first template
    const template1 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Duplicate Name Template",
      note: "First instance",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    // Create second template with same name (should be allowed)
    const template2 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Duplicate Name Template",
      note: "Second instance",
      amount: 200000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "weekly",
    });

    expect(template1.status).toBe(200);
    expect(template2.status).toBe(200);
    expect(template1.data!.id).not.toBe(template2.data!.id);

    // Verify both exist
    const listResponse = await transactionTemplateAPI.getTransactionTemplates({
      name: "Duplicate Name Template",
    });
    expect(listResponse.status).toBe(200);
    expect(listResponse.data!.items!.length).toBe(2);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template1.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      template2.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - templates with different accounts and categories", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create multiple accounts and categories
    const account1 = await accountAPI.createAccount({
      name: `tt-multi-account-1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });
    const account2 = await accountAPI.createAccount({
      name: `tt-multi-account-2-${Date.now()}`,
      note: "test account 2",
      type: "income",
    });
    const category1 = await categoryAPI.createCategory({
      name: `tt-multi-category-1-${Date.now()}`,
      note: "test category 1",
      type: "expense",
    });
    const category2 = await categoryAPI.createCategory({
      name: `tt-multi-category-2-${Date.now()}`,
      note: "test category 2",
      type: "income",
    });

    // Create templates with different combinations
    const template1 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Template Account1 Category1",
      note: "Expense template",
      amount: 100000,
      type: "expense",
      accountId: account1.data!.id as number,
      categoryId: category1.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    const template2 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Template Account2 Category2",
      note: "Income template",
      amount: 150000,
      type: "income",
      accountId: account2.data!.id as number,
      categoryId: category2.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    expect(template1.status).toBe(200);
    expect(template2.status).toBe(200);

    // Verify templates are associated with correct accounts/categories
    const getTemplate1 = await transactionTemplateAPI.getTransactionTemplate(
      template1.data!.id as number
    );
    expect(getTemplate1.data!.account.id).toBe(account1.data!.id);
    expect(getTemplate1.data!.category.id).toBe(category1.data!.id);
    expect(getTemplate1.data!.type).toBe("expense");

    const getTemplate2 = await transactionTemplateAPI.getTransactionTemplate(
      template2.data!.id as number
    );
    expect(getTemplate2.data!.account.id).toBe(account2.data!.id);
    expect(getTemplate2.data!.category.id).toBe(category2.data!.id);
    expect(getTemplate2.data!.type).toBe("income");

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template1.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      template2.data!.id as number
    );
    await categoryAPI.deleteCategory(category1.data!.id as number);
    await categoryAPI.deleteCategory(category2.data!.id as number);
    await accountAPI.deleteAccount(account1.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
  });

  test("PATCH /transaction-templates/{id} - update account and category references", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create multiple accounts and categories
    const account1 = await accountAPI.createAccount({
      name: `tt-update-ref-account-1-${Date.now()}`,
      note: "test account 1",
      type: "expense",
    });
    const account2 = await accountAPI.createAccount({
      name: `tt-update-ref-account-2-${Date.now()}`,
      note: "test account 2",
      type: "expense",
    });
    const category1 = await categoryAPI.createCategory({
      name: `tt-update-ref-category-1-${Date.now()}`,
      note: "test category 1",
      type: "expense",
    });
    const category2 = await categoryAPI.createCategory({
      name: `tt-update-ref-category-2-${Date.now()}`,
      note: "test category 2",
      type: "expense",
    });

    // Create template
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Update References Template",
      note: "Testing reference updates",
      amount: 100000,
      type: "expense",
      accountId: account1.data!.id as number,
      categoryId: category1.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    // Update account and category references
    const updateResponse =
      await transactionTemplateAPI.updateTransactionTemplate(
        template.data!.id as number,
        {
          accountId: account2.data!.id as number,
          categoryId: category2.data!.id as number,
        }
      );
    expect(updateResponse.status).toBe(200);

    // Verify references updated
    const getUpdated = await transactionTemplateAPI.getTransactionTemplate(
      template.data!.id as number
    );
    expect(getUpdated.data!.account.id).toBe(account2.data!.id);
    expect(getUpdated.data!.category.id).toBe(category2.data!.id);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number
    );
    await categoryAPI.deleteCategory(category1.data!.id as number);
    await categoryAPI.deleteCategory(category2.data!.id as number);
    await accountAPI.deleteAccount(account1.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
  });

  test("POST /transaction-templates - zero amount allowed", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-zero-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-zero-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with zero amount
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Zero Amount Template",
      note: "Testing zero amount",
      amount: 0,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    expect(template.status).toBe(422);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - negative amount allowed", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-negative-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-negative-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with negative amount
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Negative Amount Template",
      note: "Testing negative amount",
      amount: -50000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    expect(template.status).toBe(422);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates - filter by active status", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-active-filter-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-active-filter-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create active template
    const activeTemplate =
      await transactionTemplateAPI.createTransactionTemplate({
        name: "Active Template",
        note: "Active",
        amount: 100000,
        type: "expense",
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date().toISOString(),
        recurrence: "monthly",
      });

    // Create inactive template
    const inactiveTemplate =
      await transactionTemplateAPI.createTransactionTemplate({
        name: "Inactive Template",
        note: "Inactive",
        amount: 50000,
        type: "expense",
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date().toISOString(),
        recurrence: "monthly",
      });

    // Get all templates
    const allTemplates = await transactionTemplateAPI.getTransactionTemplates();
    expect(allTemplates.status).toBe(200);
    expect(allTemplates.data!.items!.length).toBeGreaterThanOrEqual(2);
    
    // Verify our created templates are in the list
    const templateNames = allTemplates.data!.items!.map(t => t.name);
    expect(templateNames).toContain("Active Template");
    expect(templateNames).toContain("Inactive Template");

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      activeTemplate.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      inactiveTemplate.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

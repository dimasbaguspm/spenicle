import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Common CRUD", () => {
  test("POST /transaction-templates - create transaction template", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const templateData = {
      name: `Monthly Rent ${Date.now()}`,
      note: "Monthly rent payment",
      amount: 150000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(), // ISO datetime format
      recurrence: "monthly" as const,
    };

    const res =
      await transactionTemplateAPI.createTransactionTemplate(templateData);
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data!.name).toBe(templateData.name);
    expect(res.data!.amount).toBe(templateData.amount);
    expect(res.data!.type).toBe(templateData.type);

    const id = res.data!.id as number;

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates - list transaction templates returns items", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-list-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-list-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Salary ${Date.now()}`,
      note: "Monthly salary",
      amount: 5000000,
      type: "income" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const id = created.data!.id as number;

    const listRes = await transactionTemplateAPI.getTransactionTemplates();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates/:id - get transaction template by id", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-get-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-get-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const templateName = `Internet Bill ${Date.now()}`;
    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: templateName,
      note: "Monthly internet payment",
      amount: 500000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const id = created.data!.id as number;

    const getRes = await transactionTemplateAPI.getTransactionTemplate(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);
    expect(getRes.data!.name).toBe(templateName);
    expect(getRes.data!.amount).toBe(500000);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /transaction-templates/:id - update transaction template", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-update-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-update-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Electricity Bill ${Date.now()}`,
      note: "Monthly electricity payment",
      amount: 300000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const id = created.data!.id as number;

    const newName = `Electricity Bill ${Date.now()} - Updated`;
    const newAmount = 350000;
    const updateRes = await transactionTemplateAPI.updateTransactionTemplate(
      id,
      {
        name: newName,
        amount: newAmount,
        note: "Updated description",
      },
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe(newName);
    expect(updateRes.data!.amount).toBe(newAmount);
    expect(updateRes.data!.note).toBe("Updated description");

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(id);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("DELETE /transaction-templates/:id - delete transaction template", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-delete-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-delete-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const created = await transactionTemplateAPI.createTransactionTemplate({
      name: `Water Bill ${Date.now()}`,
      note: "Monthly water payment",
      amount: 200000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const id = created.data!.id as number;

    const delRes = await transactionTemplateAPI.deleteTransactionTemplate(id);
    expect([200, 204]).toContain(delRes.status);

    const afterGet = await transactionTemplateAPI.getTransactionTemplate(id);
    expect(afterGet.status).not.toBe(200);

    // Cleanup
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates/:templateId/related - get related transactions for template", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-related-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-related-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: `Rent ${Date.now()}`,
      note: "Monthly rent",
      amount: 150000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const templateId = template.data!.id as number;

    // Get related transactions (should be empty initially)
    const relatedRes =
      await transactionTemplateAPI.getTransactionTemplateRelatedTransactions(
        templateId,
      );
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data).toBeDefined();
    expect(Array.isArray(relatedRes.data!.items)).toBe(true);
    expect(relatedRes.data!.items!.length).toBe(0); // No related transactions yet
    expect(relatedRes.data!.totalCount).toBe(0);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

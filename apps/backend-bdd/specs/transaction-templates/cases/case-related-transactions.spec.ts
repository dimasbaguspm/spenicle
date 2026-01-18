import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Related Transactions Cases", () => {
  test("should return paginated related transactions with filters", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for isolation
    await ensureCleanDB();
    const account = await accountAPI.createAccount({
      name: `tt-rel-case-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-rel-case-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: `Test Template ${Date.now()}`,
      amount: 100000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly" as const,
    });
    const templateId = template.data!.id as number;

    // Test with pagination parameters
    const relatedRes =
      await transactionTemplateAPI.getTransactionTemplateRelatedTransactions(
        templateId,
        {
          pageNumber: 1,
          pageSize: 10,
          sortBy: "date",
          sortOrder: "desc",
        },
      );
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data!.pageNumber).toBe(1);
    expect(relatedRes.data!.pageSize).toBe(10);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should handle non-existent template ID", async ({
    transactionTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for isolation
    await ensureCleanDB();

    const relatedRes =
      await transactionTemplateAPI.getTransactionTemplateRelatedTransactions(
        999999,
      );
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data!.items).toEqual([]);
  });

  test("should return empty results for template with no related transactions", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for isolation
    await ensureCleanDB();
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-empty-rel-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-empty-rel-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: `Empty Template ${Date.now()}`,
      amount: 50000,
      type: "expense" as const,
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "none" as const,
    });
    const templateId = template.data!.id as number;

    const relatedRes =
      await transactionTemplateAPI.getTransactionTemplateRelatedTransactions(
        templateId,
      );
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data!.items).toEqual([]);
    expect(relatedRes.data!.totalCount).toBe(0);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

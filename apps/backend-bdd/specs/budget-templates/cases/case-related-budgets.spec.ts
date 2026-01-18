import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Related Budgets Cases", () => {
  test("should return paginated related budgets with filters", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for isolation
    await ensureCleanDB();
    const account = await accountAPI.createAccount({
      name: `bt-rel-case-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-rel-case-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 100000,
      recurrence: "monthly",
      startDate: new Date().toISOString(),
    });
    const templateId = template.data!.id as number;

    // Test with pagination parameters
    const relatedRes = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      templateId,
      {
        pageNumber: 1,
        pageSize: 10,
      },
    );
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data!.pageNumber).toBe(1);
    expect(relatedRes.data!.pageSize).toBe(10);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("should handle non-existent template ID", async ({
    budgetTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for isolation
    await ensureCleanDB();

    const relatedRes =
      await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(999999);
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data!.items).toEqual([]);
  });

  test("should return empty results for template with no related budgets", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database for isolation
    await ensureCleanDB();
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-empty-rel-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-empty-rel-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const template = await budgetTemplateAPI.createBudgetTemplate({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amountLimit: 50000,
      recurrence: "none",
      startDate: new Date().toISOString(),
    });
    const templateId = template.data!.id as number;

    const relatedRes =
      await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(templateId);
    expect(relatedRes.status).toBe(200);
    expect(relatedRes.data!.items).toEqual([]);
    expect(relatedRes.data!.totalCount).toBe(0);

    // Cleanup
    await budgetTemplateAPI.deleteBudgetTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Sorting and Recurring Stats", () => {
  test("GET /transaction-templates - sort by nextDueAt works correctly", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-sort-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-sort-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Clean up any existing test templates from previous runs
    const existingTemplatesRes =
      await transactionTemplateAPI.getTransactionTemplates({});
    if (
      existingTemplatesRes.status === 200 &&
      existingTemplatesRes.data?.items
    ) {
      for (const template of existingTemplatesRes.data.items) {
        if (template.name.startsWith("Template Due")) {
          await transactionTemplateAPI.deleteTransactionTemplate(template.id);
        }
      }
    }

    // Create templates with different nextDueAt dates
    const now = new Date();
    const testId = Date.now();
    const templates = [
      {
        name: `Template Due Today ${testId}`,
        startDate: now.toISOString(), // today
        recurrence: "weekly" as const,
      },
      {
        name: `Template Due Tomorrow ${testId}`,
        startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        recurrence: "monthly" as const,
      },
      {
        name: `Template Due Next Week ${testId}`,
        startDate: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // next week
        recurrence: "yearly" as const,
      },
    ];

    const createdTemplates = [];
    for (const template of templates) {
      const res = await transactionTemplateAPI.createTransactionTemplate({
        name: template.name,
        note: "Test template for sorting",
        amount: 100000,
        type: "expense",
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: template.startDate,
        recurrence: template.recurrence,
      });
      if (res.status !== 200) {
        console.log("Error response:", res.data);
      }
      expect(res.status).toBe(200);
      createdTemplates.push(res.data!.id as number);
    }

    // Test sorting by nextDueAt ascending
    const ascRes = await transactionTemplateAPI.getTransactionTemplates({
      sortBy: "nextDueAt",
      sortOrder: "asc",
    });
    expect(ascRes.status).toBe(200);
    const ascItems = ascRes.data!.items || [];
    expect(ascItems.length).toBeGreaterThanOrEqual(3);

    // Find our test templates in the results
    const testTemplatesAsc = ascItems.filter(
      (item) =>
        item.name === `Template Due Next Week ${testId}` ||
        item.name === `Template Due Tomorrow ${testId}` ||
        item.name === `Template Due Today ${testId}`,
    );

    // Should be sorted: Today, Tomorrow, Next Week
    expect(testTemplatesAsc[0].name).toBe(`Template Due Today ${testId}`);
    expect(testTemplatesAsc[1].name).toBe(`Template Due Tomorrow ${testId}`);
    expect(testTemplatesAsc[2].name).toBe(`Template Due Next Week ${testId}`);

    // Test sorting by nextDueAt descending
    const descRes = await transactionTemplateAPI.getTransactionTemplates({
      sortBy: "nextDueAt",
      sortOrder: "desc",
    });
    expect(descRes.status).toBe(200);
    const descItems = descRes.data!.items || [];
    expect(descItems.length).toBeGreaterThanOrEqual(3);

    // Find our test templates in the results
    const testTemplatesDesc = descItems.filter(
      (item) =>
        item.name === `Template Due Next Week ${testId}` ||
        item.name === `Template Due Tomorrow ${testId}` ||
        item.name === `Template Due Today ${testId}`,
    );

    // Should be sorted: Next Week, Tomorrow, Today
    expect(testTemplatesDesc[0].name).toBe(`Template Due Next Week ${testId}`);
    expect(testTemplatesDesc[1].name).toBe(`Template Due Tomorrow ${testId}`);
    expect(testTemplatesDesc[2].name).toBe(`Template Due Today ${testId}`);

    // Cleanup
    for (const id of createdTemplates) {
      await transactionTemplateAPI.deleteTransactionTemplate(id);
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates - recurring stats correct for installment templates", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-installment-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-installment-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create installment template (with end date)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // started 30 days ago

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60); // ends in 60 days

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Car Loan Installment",
      note: "Monthly car loan payment",
      amount: 2000000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      recurrence: "monthly",
    });
    expect(template.status).toBe(200);
    const templateId = template.data!.id as number;

    // Get the template and check recurring stats
    const getRes =
      await transactionTemplateAPI.getTransactionTemplate(templateId);
    expect(getRes.status).toBe(200);
    const templateData = getRes.data!;

    // Should have recurring stats
    expect(templateData.recurringStats).toBeDefined();
    expect(templateData.recurringStats.occurrences).toBe(0); // no transactions created yet
    expect(templateData.recurringStats.totalSpent).toBe(0);

    // Should have remaining count (installment with end date)
    expect(templateData.recurringStats.remaining).toBeDefined();
    expect(templateData.recurringStats.remaining).toBeGreaterThan(0);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates - recurring stats correct for recurring templates", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-recurring-account-${Date.now()}`,
      note: "test account",
      type: "income",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-recurring-category-${Date.now()}`,
      note: "test category",
      type: "income",
    });

    // Create recurring template (no end date)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // started 90 days ago

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Monthly Salary",
      note: "Regular monthly salary",
      amount: 5000000,
      type: "income",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: startDate.toISOString(),
      recurrence: "monthly",
      // No endDate - this is recurring indefinitely
    });
    expect(template.status).toBe(200);
    const templateId = template.data!.id as number;

    // Get the template and check recurring stats
    const getRes =
      await transactionTemplateAPI.getTransactionTemplate(templateId);
    expect(getRes.status).toBe(200);
    const templateData = getRes.data!;

    // Should have recurring stats
    expect(templateData.recurringStats).toBeDefined();
    expect(templateData.recurringStats.occurrences).toBe(0); // no transactions created yet
    expect(templateData.recurringStats.totalSpent).toBe(0);

    // Should have null remaining (recurring with no end date)
    expect(templateData.recurringStats.remaining).toBeNull();

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

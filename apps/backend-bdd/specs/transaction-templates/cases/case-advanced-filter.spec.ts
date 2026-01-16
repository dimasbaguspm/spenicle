import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Advanced Filtering", () => {
  test("GET /transaction-templates - filter by name search", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-filter-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-filter-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create templates with different names
    const template1 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Monthly Rent Payment",
      note: "Rent",
      amount: 1500000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    const template2 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Electricity Bill",
      note: "Power",
      amount: 500000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    const template3 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Internet Subscription",
      note: "Internet",
      amount: 300000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    // Search for "bill" should return electricity
    const billSearch = await transactionTemplateAPI.getTransactionTemplates({
      name: "bill",
    });
    expect(billSearch.status).toBe(200);
    expect(billSearch.data!.items!.length).toBeGreaterThanOrEqual(1);
    const billNames = billSearch.data!.items!.map((t) => t.name);
    expect(billNames).toContain("Electricity Bill");
    expect(billNames).not.toContain("Monthly Rent Payment");

    // Search for "rent" should return rent
    const rentSearch = await transactionTemplateAPI.getTransactionTemplates({
      name: "rent",
    });
    expect(rentSearch.status).toBe(200);
    expect(rentSearch.data!.items!.length).toBeGreaterThanOrEqual(1);
    const rentNames = rentSearch.data!.items!.map((t) => t.name);
    expect(rentNames).toContain("Monthly Rent Payment");

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template1.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      template2.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      template3.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates - pagination works correctly", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-paginate-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-paginate-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create multiple templates
    const templates = [];
    for (let i = 0; i < 5; i++) {
      const template = await transactionTemplateAPI.createTransactionTemplate({
        name: `Template ${i} ${Date.now()}`,
        note: `Test template ${i}`,
        amount: 100000 * (i + 1),
        type: "expense",
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date().toISOString(),
        recurrence: "monthly",
      });
      templates.push(template.data!.id as number);
    }

    // Test pagination - page 1 with pageSize 2
    const page1 = await transactionTemplateAPI.getTransactionTemplates({
      pageNumber: 1,
      pageSize: 2,
    });
    expect(page1.status).toBe(200);
    expect(page1.data!.items!.length).toBe(2);
    expect(page1.data!.pageNumber).toBe(1);
    expect(page1.data!.pageSize).toBe(2);
    expect(page1.data!.totalCount).toBeGreaterThanOrEqual(5);

    // Test pagination - page 2 with pageSize 2
    const page2 = await transactionTemplateAPI.getTransactionTemplates({
      pageNumber: 2,
      pageSize: 2,
    });
    expect(page2.status).toBe(200);
    expect(page2.data!.items!.length).toBe(2);
    expect(page2.data!.pageNumber).toBe(2);

    // Test pagination - page 3 with pageSize 2 (should have remaining items)
    const page3 = await transactionTemplateAPI.getTransactionTemplates({
      pageNumber: 3,
      pageSize: 2,
    });
    expect(page3.status).toBe(200);
    expect(page3.data!.items!.length).toBeGreaterThan(0);
    expect(page3.data!.items!.length).toBeLessThanOrEqual(2);
    expect(page3.data!.pageNumber).toBe(3);

    // Cleanup
    for (const templateId of templates) {
      await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transaction-templates - sorting by name works", async ({
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

    // Create templates with names in reverse alphabetical order
    const templateC = await transactionTemplateAPI.createTransactionTemplate({
      name: "Zulu Template",
      note: "Z",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    const templateA = await transactionTemplateAPI.createTransactionTemplate({
      name: "Alpha Template",
      note: "A",
      amount: 200000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    const templateB = await transactionTemplateAPI.createTransactionTemplate({
      name: "Bravo Template",
      note: "B",
      amount: 300000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    // Sort by name ascending
    const ascResult = await transactionTemplateAPI.getTransactionTemplates({
      sortBy: "name",
      sortOrder: "asc",
      pageSize: 100,
    });
    expect(ascResult.status).toBe(200);
    const ascNames = ascResult.data!.items!.map((t) => t.name);
    const alphaIndex = ascNames.indexOf("Alpha Template");
    const bravoIndex = ascNames.indexOf("Bravo Template");
    const zuluIndex = ascNames.indexOf("Zulu Template");
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(bravoIndex).toBeGreaterThanOrEqual(0);
    expect(zuluIndex).toBeGreaterThanOrEqual(0);
    expect(alphaIndex).toBeLessThan(bravoIndex);
    expect(bravoIndex).toBeLessThan(zuluIndex);

    // Sort by name descending
    const descResult = await transactionTemplateAPI.getTransactionTemplates({
      sortBy: "name",
      sortOrder: "desc",
      pageSize: 100,
    });
    expect(descResult.status).toBe(200);
    const descNames = descResult.data!.items!.map((t) => t.name);
    const alphaIndexDesc = descNames.indexOf("Alpha Template");
    const bravoIndexDesc = descNames.indexOf("Bravo Template");
    const zuluIndexDesc = descNames.indexOf("Zulu Template");
    expect(alphaIndexDesc).toBeGreaterThanOrEqual(0);
    expect(bravoIndexDesc).toBeGreaterThanOrEqual(0);
    expect(zuluIndexDesc).toBeGreaterThanOrEqual(0);
    expect(zuluIndexDesc).toBeLessThan(bravoIndexDesc);
    expect(bravoIndexDesc).toBeLessThan(alphaIndexDesc);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      templateA.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      templateB.data!.id as number
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      templateC.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

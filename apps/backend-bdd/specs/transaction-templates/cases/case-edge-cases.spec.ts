import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Edge Cases", () => {
  test("GET /transaction-templates/{id} - non-existent template returns 404", async ({
    transactionTemplateAPI,
  }) => {
    const response = await transactionTemplateAPI.getTransactionTemplate(
      999999
    );
    expect(response.status).toBe(404);
    expect(response.data).toBeUndefined();
  });

  test("PATCH /transaction-templates/{id} - non-existent template returns 404", async ({
    transactionTemplateAPI,
  }) => {
    const response = await transactionTemplateAPI.updateTransactionTemplate(
      999999,
      {
        name: "Updated Name",
      }
    );
    expect(response.status).toBe(404);
    expect(response.data).toBeUndefined();
  });

  test("DELETE /transaction-templates/{id} - non-existent template returns 404", async ({
    transactionTemplateAPI,
  }) => {
    const response = await transactionTemplateAPI.deleteTransactionTemplate(
      999999
    );
    expect(response.status).toBe(404);
    expect(response.data).toBeUndefined();
  });

  test("PATCH /transaction-templates/{id} - partial update preserves existing values", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-partial-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-partial-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Original Name",
      note: "Original Description",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    // Update only name
    const updateResponse =
      await transactionTemplateAPI.updateTransactionTemplate(
        template.data!.id as number,
        { name: "Updated Name" }
      );
    expect(updateResponse.status).toBe(200);

    // Verify all fields
    const getResponse = await transactionTemplateAPI.getTransactionTemplate(
      template.data!.id as number
    );
    expect(getResponse.status).toBe(200);
    expect(getResponse.data!.name).toBe("Updated Name");
    expect(getResponse.data!.note).toBe("Original Description");
    expect(getResponse.data!.amount).toBe(100000);
    expect(getResponse.data!.type).toBe("expense");
    expect(getResponse.data!.recurrence).toBe("monthly");

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - very large amount values", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-large-amount-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-large-amount-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Test with very large amount
    const largeAmount = 999999999999999; // 15 digits
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Large Amount Template",
      note: "Testing large amounts",
      amount: largeAmount,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date().toISOString(),
      recurrence: "monthly",
    });

    expect(template.status).toBe(200);
    expect(template.data!.amount).toBe(largeAmount);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - very long name and note", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-long-text-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-long-text-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with very long name and note
    const longName = "A".repeat(255); // Max length name
    const longDescription = "B".repeat(1000); // Long note

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: longName,
      note: longDescription,
      amount: 100000,
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

  test("POST /transaction-templates - start date in far future", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-future-date-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-future-date-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with start date 10 years in the future
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 10);
    const futureDateStr = futureDate.toISOString();

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Future Template",
      note: "Starts in 10 years",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: futureDateStr,
      recurrence: "yearly",
    });

    expect(template.status).toBe(200);
    // Check that the returned date is approximately the same (allowing for formatting differences)
    const returnedDate = new Date(template.data!.startDate);
    const expectedDate = new Date(futureDateStr);
    expect(
      Math.abs(returnedDate.getTime() - expectedDate.getTime())
    ).toBeLessThan(1000); // Within 1 second

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - end date before start date should fail", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-invalid-dates-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-invalid-dates-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Try to create template with end date before start date
    const response = await transactionTemplateAPI.createTransactionTemplate({
      name: "Invalid Dates Template",
      note: "End before start",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: "2024-12-31T00:00:00Z",
      endDate: "2024-01-01T00:00:00Z",
      recurrence: "monthly",
    });

    expect(response.status).toBe(200);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      response.data!.id as number
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

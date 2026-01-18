import { test, expect } from "@fixtures/index";

test.describe("Transaction Templates - Frequency and Date Scenarios", () => {
  test("POST /transaction-templates - all frequency types work", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-frequency-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    expect(account.status).toBe(200);
    const category = await categoryAPI.createCategory({
      name: `tt-frequency-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });
    expect(category.status).toBe(200);

    const frequencies = ["none", "weekly", "monthly", "yearly"];
    const templates = [];

    // Create template for each frequency
    for (const frequency of frequencies) {
      const template = await transactionTemplateAPI.createTransactionTemplate({
        name: `${
          frequency.charAt(0).toUpperCase() + frequency.slice(1)
        } Template`,
        note: `Testing ${frequency} frequency`,
        amount: 100000,
        type: "expense",
        accountId: account.data!.id as number,
        categoryId: category.data!.id as number,
        startDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate(),
        ).toISOString(),
        recurrence: frequency as any,
      });

      expect(template.status).toBe(200);
      expect(template.data!.recurrence).toBe(frequency);
      templates.push(template.data!.id as number);
    }

    // Verify all templates exist
    const listResponse = await transactionTemplateAPI.getTransactionTemplates();
    expect(listResponse.status).toBe(200);
    expect(listResponse.data!.items!.length).toBeGreaterThanOrEqual(
      frequencies.length,
    );

    // Cleanup
    for (const templateId of templates) {
      await transactionTemplateAPI.deleteTransactionTemplate(templateId);
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - end date scenarios", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-end-date-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-end-date-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const today = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    );
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);

    // Template with end date next month
    const template2 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Medium Term Template",
      note: "Ends next month",
      amount: 75000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: today.toISOString(),
      endDate: new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        nextMonth.getDate(),
      ).toISOString(),
      recurrence: "weekly",
    });

    expect(template2.status).toBe(200);
    const expectedEndDate = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      nextMonth.getDate(),
    )
      .toISOString()
      .replace(".000Z", "Z");
    expect(template2.data!.endDate).toBe(expectedEndDate);

    // Template without end date (ongoing)
    const template3 = await transactionTemplateAPI.createTransactionTemplate({
      name: "Ongoing Template",
      note: "No end date",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: today.toISOString(),
      recurrence: "monthly",
    });

    expect(template3.status).toBe(200);
    expect(template3.data!.endDate).toBeNull();

    await transactionTemplateAPI.deleteTransactionTemplate(
      template2.data!.id as number,
    );
    await transactionTemplateAPI.deleteTransactionTemplate(
      template3.data!.id as number,
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /transaction-templates/{id} - update frequency and dates", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-update-freq-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-update-freq-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Update Frequency Template",
      note: "Testing frequency updates",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: new Date("2024-01-01").toISOString(),
      recurrence: "monthly",
    });

    // Update frequency from monthly to weekly
    const updateFreqResponse =
      await transactionTemplateAPI.updateTransactionTemplate(
        template.data!.id as number,
        { recurrence: "weekly" },
      );
    expect(updateFreqResponse.status).toBe(200);

    // Verify frequency updated
    const getAfterFreqUpdate =
      await transactionTemplateAPI.getTransactionTemplate(
        template.data!.id as number,
      );
    expect(getAfterFreqUpdate.data!.recurrence).toBe("weekly");

    // Update dates (only endDate is updatable)
    const newEndDate = new Date("2024-12-31")
      .toISOString()
      .replace(".000Z", "Z");
    const updateDatesResponse =
      await transactionTemplateAPI.updateTransactionTemplate(
        template.data!.id as number,
        {
          endDate: newEndDate,
        },
      );
    expect(updateDatesResponse.status).toBe(200);

    // Verify dates updated
    const getAfterDatesUpdate =
      await transactionTemplateAPI.getTransactionTemplate(
        template.data!.id as number,
      );
    expect(getAfterDatesUpdate.data!.endDate).toBe(newEndDate);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number,
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - start date in past", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-past-start-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-past-start-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create template with start date in the past
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);
    const pastDateStr = pastDate.toISOString().replace(".000Z", "Z");

    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "Past Start Template",
      note: "Started last year",
      amount: 100000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: pastDateStr,
      recurrence: "monthly",
    });

    expect(template.status).toBe(200);
    expect(template.data!.startDate).toBe(pastDateStr);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number,
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transaction-templates - same start and end date", async ({
    transactionTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `tt-same-dates-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `tt-same-dates-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const today = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    )
      .toISOString()
      .replace(".000Z", "Z");

    // Create template with same start and end date
    const template = await transactionTemplateAPI.createTransactionTemplate({
      name: "One Time Template",
      note: "Single occurrence",
      amount: 50000,
      type: "expense",
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      startDate: today,
      endDate: today,
      recurrence: "monthly",
    });

    expect(template.status).toBe(200);
    const expectedToday = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    )
      .toISOString()
      .replace(".000Z", "Z");
    expect(template.data!.startDate).toBe(expectedToday);
    expect(template.data!.endDate).toBe(expectedToday);

    // Cleanup
    await transactionTemplateAPI.deleteTransactionTemplate(
      template.data!.id as number,
    );
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

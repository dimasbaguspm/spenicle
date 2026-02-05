import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Sorting Cases", () => {
  test("GET /budgets - sort by nextRunAt works correctly", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account = await accountAPI.createAccount({
      name: `bt-sort-account-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bt-sort-category-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Clean up any existing test templates from previous runs
    const existingTemplatesRes = await budgetTemplateAPI.getBudgetTemplates({});
    if (
      existingTemplatesRes.status === 200 &&
      existingTemplatesRes.data?.items
    ) {
      for (const template of existingTemplatesRes.data.items) {
        if (template.note?.startsWith("Sort Test")) {
          await budgetTemplateAPI.updateBudgetTemplate(template.id, {
            active: false,
          });
        }
      }
    }

    // Create templates with different nextRunAt dates
    const now = new Date();
    const testId = Date.now();
    const templates = [
      {
        note: `Sort Test Due Today ${testId}`,
        startDate: now.toISOString(), // today
        recurrence: "weekly" as const,
      },
      {
        note: `Sort Test Due Tomorrow ${testId}`,
        startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        recurrence: "monthly" as const,
      },
      {
        note: `Sort Test Due Next Week ${testId}`,
        startDate: new Date(
          now.getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // next week
        recurrence: "yearly" as const,
      },
    ];

    const createdTemplates = [];
    for (const templateData of templates) {
      const res = await budgetTemplateAPI.createBudgetTemplate({
        accountId: account.data!.id as number,
        amountLimit: 100000,
        recurrence: templateData.recurrence,
        startDate: templateData.startDate,
        note: templateData.note,
        name: `Sorting Test ${templateData.note}`,
        active: true,
      });
      createdTemplates.push({
        id: res.data!.id as number,
        nextRunAt: res.data!.nextRunAt,
        note: templateData.note,
      });
    }

    // Sort by nextRunAt asc (earliest first)
    const listResAsc = await budgetTemplateAPI.getBudgetTemplates({
      sortBy: "nextRunAt",
      sortOrder: "asc",
    });
    expect(listResAsc.status).toBe(200);
    const itemsAsc = listResAsc.data!.items || [];
    expect(itemsAsc.length).toBeGreaterThanOrEqual(3);

    // Filter out templates with null nextRunAt for sorting validation
    const itemsAscWithNextRunAt = itemsAsc.filter(
      (item) => item.nextRunAt != null,
    );

    // Verify ascending order for items that have nextRunAt
    for (let i = 1; i < itemsAscWithNextRunAt.length; i++) {
      const prevDate = new Date(itemsAscWithNextRunAt[i - 1].nextRunAt!);
      const currDate = new Date(itemsAscWithNextRunAt[i].nextRunAt!);
      expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
    }

    // Sort by nextRunAt desc (latest first)
    const listResDesc = await budgetTemplateAPI.getBudgetTemplates({
      sortBy: "nextRunAt",
      sortOrder: "desc",
    });
    expect(listResDesc.status).toBe(200);
    const itemsDesc = listResDesc.data!.items || [];
    expect(itemsDesc.length).toBeGreaterThanOrEqual(3);

    // Filter out templates with null nextRunAt for sorting validation
    const itemsDescWithNextRunAt = itemsDesc.filter(
      (item) => item.nextRunAt != null,
    );

    // Verify descending order for items that have nextRunAt
    for (let i = 1; i < itemsDescWithNextRunAt.length; i++) {
      const prevDate = new Date(itemsDescWithNextRunAt[i - 1].nextRunAt!);
      const currDate = new Date(itemsDescWithNextRunAt[i].nextRunAt!);
      expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
    }

    // Cleanup
    for (const template of createdTemplates) {
      await budgetTemplateAPI.updateBudgetTemplate(template.id, {
        active: false,
      });
    }
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /budgets - sort by amountLimit desc returns templates in correct order", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const accountRes = await accountAPI.createAccount({
      name: `bt-amount-sort-account-${Date.now()}`,
      note: "amount sort test",
      type: "expense",
    });
    const categoryRes = await categoryAPI.createCategory({
      name: `bt-amount-sort-category-${Date.now()}`,
      note: "amount sort test",
      type: "expense",
    });
    const accountId = accountRes.data!.id as number;
    const categoryId = categoryRes.data!.id as number;

    // Create templates with different amounts
    const templates = [];
    const amounts = [50000, 150000, 100000]; // $500, $1500, $1000
    for (const amount of amounts) {
      const res = await budgetTemplateAPI.createBudgetTemplate({
        accountId,
        // categoryId, // Removed - cannot have both
        amountLimit: amount,
        recurrence: "monthly",
        startDate: new Date().toISOString(),
        note: "amount sort test",
        name: `Amount Sort Test ${amount}`,
        active: true,
      });
      templates.push({ id: res.data!.id as number, amount });
    }

    // Sort by amountLimit desc
    const listRes = await budgetTemplateAPI.getBudgetTemplates({
      sortBy: "amountLimit",
      sortOrder: "desc",
    });
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(items.length).toBeGreaterThanOrEqual(3);

    // Check descending order
    const sortedAmounts = items.map((item: any) => item.amountLimit);
    expect(sortedAmounts).toEqual([...sortedAmounts].sort((a, b) => b - a));

    // Cleanup
    for (const template of templates) {
      await budgetTemplateAPI.updateBudgetTemplate(template.id, {
        active: false,
      });
    }
    await categoryAPI.deleteCategory(categoryId);
    await accountAPI.deleteAccount(accountId);
  });
});

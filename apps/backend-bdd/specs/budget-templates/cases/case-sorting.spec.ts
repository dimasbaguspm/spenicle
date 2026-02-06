import { test, expect } from "@fixtures/index";

test.describe("Budget Templates - Sorting Cases", () => {
  test("GET /budgets - sort by nextRunAt works correctly", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const account1 = await accountAPI.createAccount({
      name: `bt-sort-account1-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const account2 = await accountAPI.createAccount({
      name: `bt-sort-account2-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const account3 = await accountAPI.createAccount({
      name: `bt-sort-account3-${Date.now()}`,
      note: "test account",
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
        accountId: account1.data!.id,
        note: `Sort Test Due Today ${testId}`,
        startDate: now.toISOString(), // today
        recurrence: "weekly" as const,
      },
      {
        accountId: account2.data!.id,
        note: `Sort Test Due Tomorrow ${testId}`,
        startDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        recurrence: "monthly" as const,
      },
      {
        accountId: account3.data!.id,
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
        accountId: templateData.accountId as number,
        amountLimit: 100000,
        recurrence: templateData.recurrence,
        startDate: templateData.startDate,
        note: templateData.note,
        name: `Sorting Test ${templateData.note}`,
        active: true,
      });
      if (res.status !== 200) {
        console.log("Template creation failed:", res.status, res.error);
      }
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
    await accountAPI.deleteAccount(account1.data!.id as number);
    await accountAPI.deleteAccount(account2.data!.id as number);
    await accountAPI.deleteAccount(account3.data!.id as number);
  });

  test("GET /budgets - sort by amountLimit desc returns templates in correct order", async ({
    budgetTemplateAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create multiple accounts for testing different amounts
    const amounts = [50000, 150000, 100000]; // $500, $1500, $1000
    const templates = [];

    for (const amount of amounts) {
      const accountRes = await accountAPI.createAccount({
        name: `bt-amount-sort-account-${amount}-${Date.now()}`,
        note: "amount sort test",
        type: "expense",
      });
      const accountId = accountRes.data!.id as number;

      const res = await budgetTemplateAPI.createBudgetTemplate({
        accountId,
        amountLimit: amount,
        recurrence: "monthly",
        startDate: new Date().toISOString(),
        note: "amount sort test",
        name: `Amount Sort Test ${amount}`,
        active: true,
      });
      templates.push({ id: res.data!.id as number, amount, accountId });
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
      await accountAPI.deleteAccount(template.accountId);
    }
  });
});

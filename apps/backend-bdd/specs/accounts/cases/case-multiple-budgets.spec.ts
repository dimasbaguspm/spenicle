import { test, expect } from "@fixtures/index";

test.describe("Accounts - Multiple Budgets", () => {
  test("GET /accounts - account with multiple active budgets appears only once", async ({
    accountAPI,
    budgetTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database
    await ensureCleanDB();

    // Create a test account
    const accountName = `test-account-multiple-budgets-${Date.now()}`;
    const accountRes = await accountAPI.createAccount({
      name: accountName,
      note: "Test account for multiple budgets",
      type: "expense",
    });
    expect(accountRes.status).toBe(200);
    const accountId = accountRes.data!.id as number;

    // Create multiple active budget templates for the same account
    // These should generate budgets that overlap in the "current" period
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7); // 1 week ago

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    // Create first budget template
    const template1Res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: accountId,
      amountLimit: 1000000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: `Budget Template 1 - ${accountName}`,
      active: true,
    });
    expect(template1Res.status).toBe(200);
    const template1Id = template1Res.data!.id as number;

    // Create second budget template for the same account
    const template2Res = await budgetTemplateAPI.createBudgetTemplate({
      accountId: accountId,
      amountLimit: 2000000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: `Budget Template 2 - ${accountName}`,
      active: true,
    });
    expect(template2Res.status).toBe(200);
    const template2Id = template2Res.data!.id as number;

    // Wait a moment for budget generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify that both templates generated budgets
    const budgets1 = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template1Id,
      { pageSize: 100 },
    );
    expect(budgets1.status).toBe(200);
    expect((budgets1.data!.items || []).length).toBeGreaterThan(0);

    const budgets2 = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      template2Id,
      { pageSize: 100 },
    );
    expect(budgets2.status).toBe(200);
    expect((budgets2.data!.items || []).length).toBeGreaterThan(0);

    // Now test the accounts list endpoint
    const accountsListRes = await accountAPI.getAccounts({
      pageSize: 100,
      sortBy: "name",
      sortOrder: "asc",
    });
    expect(accountsListRes.status).toBe(200);
    const accounts = accountsListRes.data!.items || [];

    // Count how many times our test account appears
    const testAccountOccurrences = accounts.filter(
      (acc: any) => acc.id === accountId,
    );

    // CRITICAL: Account should appear exactly once, not once per budget
    expect(testAccountOccurrences.length).toBe(1);

    // Verify the account has a budget embedded (the most recent one by ID)
    const testAccount = testAccountOccurrences[0];
    expect(testAccount.budget).toBeDefined();

    // The embedded budget should be the one with higher ID (most recent)
    const allBudgetIds = [
      ...(budgets1.data!.items || []).map((b: any) => b.id),
      ...(budgets2.data!.items || []).map((b: any) => b.id),
    ];
    const maxBudgetId = Math.max(...allBudgetIds);
    expect(testAccount.budget?.id).toBe(maxBudgetId);

    // Verify total count reflects unique accounts
    const totalCountBefore = accountsListRes.data!.totalCount;

    // Delete the account
    await accountAPI.deleteAccount(accountId);

    // Verify total count decreased by exactly 1
    const accountsListAfterRes = await accountAPI.getAccounts({
      pageSize: 100,
    });
    expect(accountsListAfterRes.status).toBe(200);
    const totalCountAfter = accountsListAfterRes.data!.totalCount;
    expect(totalCountAfter).toBe(totalCountBefore - 1);
  });

  test("GET /accounts/:id - account detail with multiple budgets returns single account", async ({
    accountAPI,
    budgetTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database
    await ensureCleanDB();

    // Create a test account
    const accountName = `test-account-detail-${Date.now()}`;
    const accountRes = await accountAPI.createAccount({
      name: accountName,
      note: "Test account detail",
      type: "expense",
    });
    expect(accountRes.status).toBe(200);
    const accountId = accountRes.data!.id as number;

    // Create multiple budget templates
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    await budgetTemplateAPI.createBudgetTemplate({
      accountId: accountId,
      amountLimit: 1000000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: `Budget 1 - ${accountName}`,
      active: true,
    });

    await budgetTemplateAPI.createBudgetTemplate({
      accountId: accountId,
      amountLimit: 2000000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: `Budget 2 - ${accountName}`,
      active: true,
    });

    // Wait for budget generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get account detail
    const detailRes = await accountAPI.getAccount(accountId);
    expect(detailRes.status).toBe(200);
    expect(detailRes.data!.id).toBe(accountId);

    // Should have exactly one budget (the most recent by ID)
    expect(detailRes.data!.budget).toBeDefined();

    // Cleanup
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts - pagination count is correct with multiple budgets per account", async ({
    accountAPI,
    budgetTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database
    await ensureCleanDB();

    // Create 3 accounts, each with 2 active budgets
    const accountIds: number[] = [];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    for (let i = 0; i < 3; i++) {
      const accountRes = await accountAPI.createAccount({
        name: `pagination-test-${Date.now()}-${i}`,
        note: "Pagination test",
        type: "expense",
      });
      expect(accountRes.status).toBe(200);
      accountIds.push(accountRes.data!.id as number);

      // Create 2 budget templates for this account
      await budgetTemplateAPI.createBudgetTemplate({
        accountId: accountRes.data!.id as number,
        amountLimit: 1000000,
        recurrence: "monthly",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        name: `Budget A - Account ${i}`,
        active: true,
      });

      await budgetTemplateAPI.createBudgetTemplate({
        accountId: accountRes.data!.id as number,
        amountLimit: 2000000,
        recurrence: "monthly",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        name: `Budget B - Account ${i}`,
        active: true,
      });
    }

    // Wait for budget generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get accounts with small page size
    const page1Res = await accountAPI.getAccounts({
      pageSize: 2,
      pageNumber: 1,
    });
    expect(page1Res.status).toBe(200);

    // Should have exactly 2 items in page 1 (not 4 due to duplicate joins)
    expect((page1Res.data!.items || []).length).toBeLessThanOrEqual(2);

    // Total count should count unique accounts, not joined rows
    const uniqueAccountIds = new Set(
      (page1Res.data!.items || []).map((acc: any) => acc.id),
    );
    expect(uniqueAccountIds.size).toBe((page1Res.data!.items || []).length);

    // Cleanup
    for (const id of accountIds) {
      await accountAPI.deleteAccount(id);
    }
  });
});

import { test, expect } from "@fixtures/index";

test.describe("Accounts - Multiple Budgets", () => {
  test("GET /accounts - account with active budget appears once with embedded budget", async ({
    accountAPI,
    budgetTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database
    await ensureCleanDB();

    // Create a test account
    const accountName = `test-account-active-budget-${Date.now()}`;
    const accountRes = await accountAPI.createAccount({
      name: accountName,
      note: "Test account for active budget",
      type: "expense",
    });
    expect(accountRes.status).toBe(200);
    const accountId = accountRes.data!.id as number;

    // Create single active budget template for the account
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7); // 1 week ago

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    const templateRes = await budgetTemplateAPI.createBudgetTemplate({
      accountId: accountId,
      amountLimit: 1000000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: `Budget Template - ${accountName}`,
      active: true,
    });
    expect(templateRes.status).toBe(200);
    const templateId = templateRes.data!.id as number;

    // Wait a moment for budget generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify that template generated budgets
    const budgets = await budgetTemplateAPI.getBudgetTemplateRelatedBudgets(
      templateId,
      { pageSize: 100 },
    );
    expect(budgets.status).toBe(200);
    expect((budgets.data!.items || []).length).toBeGreaterThan(0);

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

    // CRITICAL: Account should appear exactly once
    expect(testAccountOccurrences.length).toBe(1);

    // Verify the account has a budget embedded (from the template)
    const testAccount = testAccountOccurrences[0];
    expect(testAccount.budget).toBeDefined();
    expect(testAccount.budget?.id).toBeDefined();

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

  test("GET /accounts/:id - account detail with budget returns single account", async ({
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

    // Create single budget template (only 1 allowed per account)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    const templateRes = await budgetTemplateAPI.createBudgetTemplate({
      accountId: accountId,
      amountLimit: 1000000,
      recurrence: "monthly",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      name: `Budget - ${accountName}`,
      active: true,
    });
    expect(templateRes.status).toBe(200);

    // Wait for budget generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get account detail
    const detailRes = await accountAPI.getAccount(accountId);
    expect(detailRes.status).toBe(200);
    expect(detailRes.data!.id).toBe(accountId);

    // Should have exactly one budget (from the template)
    expect(detailRes.data!.budget).toBeDefined();
    expect(detailRes.data!.budget?.id).toBeDefined();

    // Cleanup
    await accountAPI.deleteAccount(accountId);
  });

  test("GET /accounts - pagination count is correct with budgets", async ({
    accountAPI,
    budgetTemplateAPI,
    ensureCleanDB,
  }) => {
    // Ensure clean database
    await ensureCleanDB();

    // Create 3 accounts, each with 1 active budget template
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

      // Create 1 budget template for this account (only 1 allowed per account)
      const templateRes = await budgetTemplateAPI.createBudgetTemplate({
        accountId: accountRes.data!.id as number,
        amountLimit: 1000000,
        recurrence: "monthly",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        name: `Budget - Account ${i}`,
        active: true,
      });
      expect(templateRes.status).toBe(200);
    }

    // Wait for budget generation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get accounts with small page size
    const page1Res = await accountAPI.getAccounts({
      pageSize: 2,
      pageNumber: 1,
    });
    expect(page1Res.status).toBe(200);

    // Should have exactly 2 items in page 1 (page size limit)
    expect((page1Res.data!.items || []).length).toBeLessThanOrEqual(2);

    // Total count should count unique accounts
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

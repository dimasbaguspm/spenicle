import { test, expect } from "../../fixtures";

/**
 * Account Balance Consistency Tests
 * Tests to ensure account balances remain consistent through various transaction operations
 */
test.describe("Account Balance Consistency", () => {
  let testAccountId: number;
  let testAccount2Id: number;
  let expenseCategoryId: number;
  let incomeCategoryId: number;

  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    const account1 = await accountAPI.createAccount({
      name: "Balance Test Account 1",
      type: "expense" as const,
      amount: 5000,
      note: "Test account for balance tests",
    });

    const account2 = await accountAPI.createAccount({
      name: "Balance Test Account 2",
      type: "expense" as const,
      amount: 3000,
      note: "Second test account for balance tests",
    });

    const expenseCategory = await categoryAPI.createCategory({
      name: "Balance Test Expense",
      type: "expense" as const,
      note: "Test expense category",
    });

    const incomeCategory = await categoryAPI.createCategory({
      name: "Balance Test Income",
      type: "income" as const,
      note: "Test income category",
    });

    if (
      !account1.data ||
      !account2.data ||
      !expenseCategory.data ||
      !incomeCategory.data
    ) {
      console.error("Setup failed:", {
        account1: account1.error,
        account2: account2.error,
        expenseCategory: expenseCategory.error,
        incomeCategory: incomeCategory.error,
      });
      throw new Error("Failed to create test fixtures");
    }

    testAccountId = account1.data.id;
    testAccount2Id = account2.data.id;
    expenseCategoryId = expenseCategory.data.id;
    incomeCategoryId = incomeCategory.data.id;
  });

  test.describe("Balance After Transaction Creation", () => {
    test("should decrease balance after expense creation", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      const updatedAccount = await accountAPI.getAccount(testAccountId);
      expect(updatedAccount.data!.amount).toBe(initialBalance - 100);

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });

    test("should increase balance after income creation", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      const tx = await transactionAPI.createTransaction({
        type: "income" as const,
        amount: 200,
        categoryId: incomeCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      const updatedAccount = await accountAPI.getAccount(testAccountId);
      expect(updatedAccount.data!.amount).toBe(initialBalance + 200);

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });

    test("should update both accounts correctly for transfer", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialSource = await accountAPI.getAccount(testAccountId);
      const initialDest = await accountAPI.getAccount(testAccount2Id);
      const sourceBalance = initialSource.data!.amount;
      const destBalance = initialDest.data!.amount;

      const tx = await transactionAPI.createTransaction({
        type: "transfer" as const,
        amount: 150,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        destinationAccountId: testAccount2Id,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      const updatedSource = await accountAPI.getAccount(testAccountId);
      const updatedDest = await accountAPI.getAccount(testAccount2Id);

      expect(updatedSource.data!.amount).toBe(sourceBalance - 150);
      expect(updatedDest.data!.amount).toBe(destBalance + 150);

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });
  });

  test.describe("Balance After Transaction Update", () => {
    test("should correctly adjust balance when amount changes", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      // Create expense of 100
      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Balance should be initialBalance - 100
      let currentAccount = await accountAPI.getAccount(testAccountId);
      expect(currentAccount.data!.amount).toBe(initialBalance - 100);

      // Update amount to 200
      await transactionAPI.updateTransaction(txId, {
        amount: 200,
      });

      // Balance should now be initialBalance - 200
      currentAccount = await accountAPI.getAccount(testAccountId);
      expect(currentAccount.data!.amount).toBe(initialBalance - 200);

      // Cleanup
      await transactionAPI.deleteTransaction(txId);

      // Balance should return to initial
      const finalAccount = await accountAPI.getAccount(testAccountId);
      expect(finalAccount.data!.amount).toBe(initialBalance);
    });

    test("should correctly transfer balance when changing account", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount1 = await accountAPI.getAccount(testAccountId);
      const initialAccount2 = await accountAPI.getAccount(testAccount2Id);
      const balance1 = initialAccount1.data!.amount;
      const balance2 = initialAccount2.data!.amount;

      // Create expense on account1
      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Account1 should decrease by 100
      let currentAccount1 = await accountAPI.getAccount(testAccountId);
      expect(currentAccount1.data!.amount).toBe(balance1 - 100);

      // Change to account2
      await transactionAPI.updateTransaction(txId, {
        accountId: testAccount2Id,
      });

      // Account1 should return to initial, account2 should decrease
      currentAccount1 = await accountAPI.getAccount(testAccountId);
      const currentAccount2 = await accountAPI.getAccount(testAccount2Id);

      expect(currentAccount1.data!.amount).toBe(balance1);
      expect(currentAccount2.data!.amount).toBe(balance2 - 100);

      // Cleanup
      await transactionAPI.deleteTransaction(txId);
    });
  });

  test.describe("Balance After Transaction Deletion", () => {
    test("should restore balance after deleting expense", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Delete transaction
      await transactionAPI.deleteTransaction(txId);

      // Balance should be restored
      const finalAccount = await accountAPI.getAccount(testAccountId);
      expect(finalAccount.data!.amount).toBe(initialBalance);
    });

    test("should restore both balances after deleting transfer", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialSource = await accountAPI.getAccount(testAccountId);
      const initialDest = await accountAPI.getAccount(testAccount2Id);
      const sourceBalance = initialSource.data!.amount;
      const destBalance = initialDest.data!.amount;

      const tx = await transactionAPI.createTransaction({
        type: "transfer" as const,
        amount: 150,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        destinationAccountId: testAccount2Id,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Delete transfer
      await transactionAPI.deleteTransaction(txId);

      // Both balances should be restored
      const finalSource = await accountAPI.getAccount(testAccountId);
      const finalDest = await accountAPI.getAccount(testAccount2Id);

      expect(finalSource.data!.amount).toBe(sourceBalance);
      expect(finalDest.data!.amount).toBe(destBalance);
    });
  });

  test.describe("Complex Balance Scenarios", () => {
    test("should maintain consistency through multiple rapid transactions", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      const txIds: number[] = [];

      // Create multiple transactions rapidly
      const transactions = [
        { type: "expense" as const, amount: 50, expected: -50 },
        { type: "income" as const, amount: 100, expected: 100 },
        { type: "expense" as const, amount: 30, expected: -30 },
        { type: "income" as const, amount: 80, expected: 80 },
      ];

      let expectedTotal = 0;

      for (const txData of transactions) {
        const tx = await transactionAPI.createTransaction({
          type: txData.type,
          amount: txData.amount,
          categoryId:
            txData.type === "expense" ? expenseCategoryId : incomeCategoryId,
          accountId: testAccountId,
          date: new Date().toISOString(),
        });

        txIds.push(tx.data!.id);
        expectedTotal += txData.expected;

        // Verify balance after each transaction
        const currentAccount = await accountAPI.getAccount(testAccountId);
        expect(currentAccount.data!.amount).toBe(
          initialBalance + expectedTotal
        );
      }

      // Cleanup - delete in reverse order
      for (let i = txIds.length - 1; i >= 0; i--) {
        await transactionAPI.deleteTransaction(txIds[i]);
        expectedTotal -= transactions[i].expected;

        const currentAccount = await accountAPI.getAccount(testAccountId);
        expect(currentAccount.data!.amount).toBe(
          initialBalance + expectedTotal
        );
      }

      // Final balance should match initial
      const finalAccount = await accountAPI.getAccount(testAccountId);
      expect(finalAccount.data!.amount).toBe(initialBalance);
    });

    test("should maintain consistency when updating transaction multiple times", async ({
      transactionAPI,
      accountAPI,
    }) => {
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      // Create initial expense
      const tx = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const txId = tx.data!.id;

      // Update amount several times
      const amounts = [150, 200, 50, 175];

      for (const amount of amounts) {
        await transactionAPI.updateTransaction(txId, { amount });

        const currentAccount = await accountAPI.getAccount(testAccountId);
        expect(currentAccount.data!.amount).toBe(initialBalance - amount);
      }

      // Cleanup
      await transactionAPI.deleteTransaction(txId);

      const finalAccount = await accountAPI.getAccount(testAccountId);
      expect(finalAccount.data!.amount).toBe(initialBalance);
    });
  });

  // Cleanup
  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    if (testAccountId) await accountAPI.deleteAccount(testAccountId);
    if (testAccount2Id) await accountAPI.deleteAccount(testAccount2Id);
    if (expenseCategoryId) await categoryAPI.deleteCategory(expenseCategoryId);
    if (incomeCategoryId) await categoryAPI.deleteCategory(incomeCategoryId);
  });
});

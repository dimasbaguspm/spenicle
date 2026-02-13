import { test, expect } from "../../../fixtures";

test.describe("Transactions - Bulk Update with Draft", () => {
  test("PATCH /transactions/bulk/draft - saves draft to Redis (one per user)", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Arrange: Create test data
    const account = await accountAPI.createAccount({
      name: `bulk-draft-acc-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    expect(account.status).toBe(200);
    expect(account.data).toBeDefined();

    const category = await categoryAPI.createCategory({
      name: `bulk-draft-cat-${Date.now()}`,
      note: "test category",
      type: "expense",
    });
    expect(category.status).toBe(200);
    expect(category.data).toBeDefined();

    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Original note 1",
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Original note 2",
    });

    // Act: Save draft (no draftId needed)
    const draftResponse = await transactionAPI.saveBulkDraft({
      updates: [
        {
          id: tx1.data!.id as number,
          note: "Updated note 1",
          amount: 150000,
        },
        {
          id: tx2.data!.id as number,
          note: "Updated note 2",
        },
      ],
    });

    // Assert
    expect(draftResponse.status).toBe(200);
    expect(draftResponse.data!.transactionCount).toBe(2);
    expect(draftResponse.data!.createdAt).toBeDefined();
    expect(draftResponse.data!.expiresAt).toBeDefined();

    // Cleanup
    await transactionAPI.deleteBulkDraft(); // Delete draft
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("GET /transactions/bulk/draft - retrieves saved draft", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `bulk-get-draft-acc-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bulk-get-draft-cat-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      date: new Date().toISOString(),
    });

    const updates = [
      {
        id: tx1.data!.id as number,
        note: "Draft note",
        amount: 200000,
      },
    ];

    await transactionAPI.saveBulkDraft({ updates });

    // Act: Retrieve draft (no draftId needed)
    const retrievedDraft = await transactionAPI.getBulkDraft();

    // Assert
    expect(retrievedDraft.status).toBe(200);
    expect(retrievedDraft.data!.updates).toHaveLength(1);
    expect(retrievedDraft.data!.updates![0].id).toBe(tx1.data!.id);
    expect(retrievedDraft.data!.updates![0].note).toBe("Draft note");
    expect(retrievedDraft.data!.updates![0].amount).toBe(200000);

    // Cleanup
    await transactionAPI.deleteBulkDraft();
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transactions/bulk/draft/commit - commits all changes atomically", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `bulk-commit-acc-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bulk-commit-cat-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    // Create 3 transactions
    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Transaction 1",
    });

    const tx2 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 50000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Transaction 2",
    });

    const tx3 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 75000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Transaction 3",
    });

    // Save draft with updates
    await transactionAPI.saveBulkDraft({
      updates: [
        {
          id: tx1.data!.id as number,
          note: "Updated Transaction 1",
          amount: 150000, // Changed amount
        },
        {
          id: tx2.data!.id as number,
          note: "Updated Transaction 2",
        },
        {
          id: tx3.data!.id as number,
          note: "Updated Transaction 3",
          amount: 80000, // Changed amount
        },
      ],
    });

    // Act: Commit draft (no draftId needed)
    const commitResponse = await transactionAPI.commitBulkDraft();

    // Assert: Commit response
    expect(commitResponse.status).toBe(200);
    expect(commitResponse.data!.successCount).toBe(3);
    expect(commitResponse.data!.updatedIds).toHaveLength(3);
    expect(commitResponse.data!.durationMs).toBeGreaterThan(0);

    // Verify transactions were updated
    const updatedTx1 = await transactionAPI.getTransaction(
      tx1.data!.id as number,
    );
    expect(updatedTx1.data!.note).toBe("Updated Transaction 1");
    expect(updatedTx1.data!.amount).toBe(150000);

    const updatedTx2 = await transactionAPI.getTransaction(
      tx2.data!.id as number,
    );
    expect(updatedTx2.data!.note).toBe("Updated Transaction 2");
    expect(updatedTx2.data!.amount).toBe(50000); // Unchanged

    const updatedTx3 = await transactionAPI.getTransaction(
      tx3.data!.id as number,
    );
    expect(updatedTx3.data!.note).toBe("Updated Transaction 3");
    expect(updatedTx3.data!.amount).toBe(80000);

    // Verify draft was deleted
    const deletedDraft = await transactionAPI.getBulkDraft();
    expect(deletedDraft.status).toBe(404);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await transactionAPI.deleteTransaction(tx3.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("POST /transactions/bulk/draft/commit - rolls back on error (all-or-nothing)", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `bulk-rollback-acc-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bulk-rollback-cat-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Valid transaction",
    });

    // Save draft with one valid and one invalid update (non-existent transaction)
    await transactionAPI.saveBulkDraft({
      updates: [
        {
          id: tx1.data!.id as number,
          note: "This should not be saved",
        },
        {
          id: 999999999, // Non-existent transaction
          note: "This will cause failure",
        },
      ],
    });

    // Act: Commit draft (should fail)
    const commitResponse = await transactionAPI.commitBulkDraft();

    // Assert: Commit failed
    expect(commitResponse.status).toBe(404); // Transaction not found

    // Verify original transaction was NOT updated (rollback)
    const unchangedTx = await transactionAPI.getTransaction(
      tx1.data!.id as number,
    );
    expect(unchangedTx.data!.note).toBe("Valid transaction"); // Still original

    // Cleanup
    await transactionAPI.deleteBulkDraft(); // Clean up failed draft
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });

  test("PATCH /transactions/bulk/draft - validates maximum draft size (500 transactions)", async ({
    transactionAPI,
  }) => {
    const updates = [];

    // Create 501 updates (exceeds limit)
    for (let i = 1; i <= 501; i++) {
      updates.push({
        id: i,
        note: `Update ${i}`,
      });
    }

    // Act
    const response = await transactionAPI.saveBulkDraft({ updates });

    // Assert
    expect(response.status).toBe(400);
    // Huma validation errors return 400 status - just verify it's rejected
    // (The actual response body structure may vary)
  });

  test("GET /transactions/bulk/draft - returns 404 for non-existent draft", async ({
    transactionAPI,
  }) => {
    // Act
    const response = await transactionAPI.getBulkDraft();

    // Assert
    expect(response.status).toBe(404);
  });

  test("DELETE /transactions/bulk/draft - deletes draft without committing", async ({
    accountAPI,
    categoryAPI,
    transactionAPI,
  }) => {
    // Arrange
    const account = await accountAPI.createAccount({
      name: `bulk-delete-acc-${Date.now()}`,
      note: "test account",
      type: "expense",
    });
    const category = await categoryAPI.createCategory({
      name: `bulk-delete-cat-${Date.now()}`,
      note: "test category",
      type: "expense",
    });

    const tx1 = await transactionAPI.createTransaction({
      accountId: account.data!.id as number,
      categoryId: category.data!.id as number,
      amount: 100000,
      type: "expense" as const,
      date: new Date().toISOString(),
      note: "Original note",
    });

    // Save draft
    await transactionAPI.saveBulkDraft({
      updates: [{ id: tx1.data!.id as number, note: "Draft note" }],
    });

    // Act: Delete draft
    const deleteResponse = await transactionAPI.deleteBulkDraft();

    // Assert
    expect(deleteResponse.status).toBe(204);

    // Verify draft is gone
    const getDraftResponse = await transactionAPI.getBulkDraft();
    expect(getDraftResponse.status).toBe(404);

    // Verify original transaction unchanged
    const unchangedTx = await transactionAPI.getTransaction(
      tx1.data!.id as number,
    );
    expect(unchangedTx.data!.note).toBe("Original note");

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await categoryAPI.deleteCategory(category.data!.id as number);
    await accountAPI.deleteAccount(account.data!.id as number);
  });
});

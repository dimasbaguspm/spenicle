import { test, expect } from "@fixtures/index";

test.describe("Transaction Tags - Remove Tag Cases", () => {
  test("DELETE /transactions/{transactionId}/tags/{tagId} - remove non-existent tag", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-remove-nonexist-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-remove-nonexist-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for removing non-existent tag",
    });

    // Try to remove non-existent tag
    const removeRes = await transactionAPI.removeTransactionTag(
      tx.data!.id as number,
      999999
    );
    expect(removeRes.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("DELETE /transactions/{transactionId}/tags/{tagId} - remove tag from non-existent transaction", async ({
    transactionAPI,
    tagAPI,
  }) => {
    const tag = await tagAPI.createTag({
      name: `tx-remove-nonexist-tx-${Date.now()}`,
    });

    // Try to remove tag from non-existent transaction
    const removeRes = await transactionAPI.removeTransactionTag(
      999999,
      tag.data!.id as number
    );
    expect(removeRes.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(tag.data!.id as number);
  });

  test("DELETE /transactions/{transactionId}/tags/{tagId} - remove tag not associated with transaction", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-remove-unassoc-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-remove-unassoc-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `tx-unassoc-tag-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for removing unassociated tag",
    });

    // Try to remove tag that's not associated with this transaction
    const removeRes = await transactionAPI.removeTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(removeRes.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("DELETE /transactions/{transactionId}/tags/{tagId} - remove already removed tag", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-remove-twice-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-remove-twice-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `tx-remove-twice-tag-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for removing tag twice",
    });

    // Add tag first
    await transactionAPI.addTransactionTag(tx.data!.id as number, tag.data!.id);

    // Remove tag first time
    const remove1Res = await transactionAPI.removeTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(remove1Res.status).toBeGreaterThanOrEqual(200);

    // Try to remove same tag again
    const remove2Res = await transactionAPI.removeTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(remove2Res.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

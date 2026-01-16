import { test, expect } from "@fixtures/index";

test.describe("Transaction Tags - Edge Cases", () => {
  test("Transaction tags survive transaction updates", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-tags-survive-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-tags-survive-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `tx-survive-tag-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for tag survival test",
    });

    // Add tag
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );

    // Update transaction (change note)
    const updateRes = await transactionAPI.updateTransaction(
      tx.data!.id as number,
      {
        note: "updated note",
      }
    );
    expect(updateRes.status).toBeGreaterThanOrEqual(200);

    // Verify tag still exists
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBeGreaterThanOrEqual(200);
    expect(tagsRes.data!.items!.length).toBe(1);
    expect(tagsRes.data!.items![0].tagName).toBe(tag.data!.name);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("Multiple transactions can share same tag", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-shared-tag-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-shared-tag-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `shared-tag-${Date.now()}`,
    });

    // Create two transactions
    const tx1 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx1 with shared tag",
    });
    const tx2 = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 2000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx2 with shared tag",
    });

    // Add same tag to both transactions
    await transactionAPI.addTransactionTag(
      tx1.data!.id as number,
      tag.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx2.data!.id as number,
      tag.data!.id as number
    );

    // Verify both transactions have the tag
    const tags1Res = await transactionAPI.getTransactionTags(
      tx1.data!.id as number
    );
    expect(tags1Res.status).toBeGreaterThanOrEqual(200);
    expect(tags1Res.data!.items!.length).toBe(1);
    expect(tags1Res.data!.items![0].tagName).toBe(tag.data!.name);

    const tags2Res = await transactionAPI.getTransactionTags(
      tx2.data!.id as number
    );
    expect(tags2Res.status).toBeGreaterThanOrEqual(200);
    expect(tags2Res.data!.items!.length).toBe(1);
    expect(tags2Res.data!.items![0].tagName).toBe(tag.data!.name);

    // Remove tag from one transaction, verify other still has it
    await transactionAPI.removeTransactionTag(
      tx1.data!.id as number,
      tag.data!.id as number
    );

    const tags1AfterRes = await transactionAPI.getTransactionTags(
      tx1.data!.id as number
    );
    expect(tags1AfterRes.status).toBeGreaterThanOrEqual(200);
    expect(tags1AfterRes.data!.items!.length).toBe(0);

    const tags2AfterRes = await transactionAPI.getTransactionTags(
      tx2.data!.id as number
    );
    expect(tags2AfterRes.status).toBeGreaterThanOrEqual(200);
    expect(tags2AfterRes.data!.items!.length).toBe(1);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("Tag deletion doesn't affect transaction-tag associations", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-tag-delete-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-tag-delete-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `delete-me-tag-${Date.now()}`,
    });

    // Create transaction and add tag
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx with tag to be deleted",
    });
    await transactionAPI.addTransactionTag(tx.data!.id as number, tag.data!.id);

    // Delete the tag itself
    await tagAPI.deleteTag(tag.data!.id as number);

    // Transaction should still exist and be retrievable
    const getTxRes = await transactionAPI.getTransaction(tx.data!.id as number);
    expect(getTxRes.status).toBeGreaterThanOrEqual(200);

    // Getting transaction tags might return empty or error, depending on API design
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    // This could be 200 with empty array or 400 depending on implementation
    expect([200, 400]).toContain(tagsRes.status);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("Individual tag operations work correctly", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-tag-ops-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-tag-ops-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag1 = await tagAPI.createTag({
      name: `tag-ops-1-${Date.now()}`,
    });
    const tag2 = await tagAPI.createTag({
      name: `tag-ops-2-${Date.now()}`,
    });
    const tag3 = await tagAPI.createTag({
      name: `tag-ops-3-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for individual tag operations",
    });

    // Add initial tags individually
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag1.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag2.data!.id as number
    );

    // Verify initial tags
    let tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBeGreaterThanOrEqual(200);
    expect(tagsRes.data!.items!.length).toBe(2);
    let tagIds = tagsRes.data!.items!.map((t) => t.tagId);
    expect(tagIds).toContain(tag1.data!.id);
    expect(tagIds).toContain(tag2.data!.id);

    // Remove one tag and add another
    await transactionAPI.removeTransactionTag(
      tx.data!.id as number,
      tag1.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag3.data!.id as number
    );

    // Verify final state
    tagsRes = await transactionAPI.getTransactionTags(tx.data!.id as number);
    expect(tagsRes.status).toBeGreaterThanOrEqual(200);
    expect(tagsRes.data!.items!.length).toBe(2);
    tagIds = tagsRes.data!.items!.map((t) => t.tagId);
    expect(tagIds).toContain(tag2.data!.id);
    expect(tagIds).toContain(tag3.data!.id);
    expect(tagIds).not.toContain(tag1.data!.id);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag1.data!.id as number);
    await tagAPI.deleteTag(tag2.data!.id as number);
    await tagAPI.deleteTag(tag3.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

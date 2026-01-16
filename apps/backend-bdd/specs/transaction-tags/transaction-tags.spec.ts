import { test, expect } from "@fixtures/index";

test.describe("Transaction Tags - Common CRUD", () => {
  test("POST /transactions/{id}/tags - add tag to transaction", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-tag-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-tag-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `tx-tag-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx with tag",
    });

    // Add tag to transaction
    const addRes = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(addRes.status).toBeGreaterThanOrEqual(200);

    // Verify tag was added
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBeGreaterThanOrEqual(200);
    expect(tagsRes.data!.items!.length).toBeGreaterThan(0);
    expect(tagsRes.data!.items!.some((t) => t.tagName === tag.data!.name)).toBe(
      true
    );

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("GET /transactions/{id}/tags - list transaction tags returns items", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-tags-list-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-tags-list-cat-${Date.now()}`,
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
      note: "tx for tag listing",
    });

    // Get tags (should be empty initially)
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBeGreaterThanOrEqual(200);
    expect(Array.isArray(tagsRes.data!.items)).toBe(true);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("DELETE /transactions/{transactionId}/tags/{tagId} - remove tag from transaction", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-tag-remove-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-tag-remove-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `tx-tag-remove-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for tag removal",
    });

    // Add tag first
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );

    // Remove tag
    const removeRes = await transactionAPI.removeTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(removeRes.status).toBeGreaterThanOrEqual(200);

    // Verify tag was removed
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBeGreaterThanOrEqual(200);
    expect(tagsRes.data!.items!.some((t) => t.id === tag.data!.id)).toBe(false);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

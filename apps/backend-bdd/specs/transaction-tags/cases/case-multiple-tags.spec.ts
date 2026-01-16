import { test, expect } from "@fixtures/index";

test.describe("Transaction Tags - Multiple Tags Cases", () => {
  test("Multiple tags can be added to same transaction", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-multi-tag-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-multi-tag-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag1 = await tagAPI.createTag({
      name: `tx-multi-tag-1-${Date.now()}`,
    });
    const tag2 = await tagAPI.createTag({
      name: `tx-multi-tag-2-${Date.now()}`,
    });
    const tag3 = await tagAPI.createTag({
      name: `tx-multi-tag-3-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for multiple tags",
    });

    // Add multiple tags
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag1.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag2.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag3.data!.id as number
    );

    // Verify all tags are present
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.data!.items!.length).toBe(3);
    const tagIds = tagsRes.data!.items!.map((t) => t.tagId);
    expect(tagIds).toContain(tag1.data!.id);
    expect(tagIds).toContain(tag2.data!.id);
    expect(tagIds).toContain(tag3.data!.id);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag1.data!.id as number);
    await tagAPI.deleteTag(tag2.data!.id as number);
    await tagAPI.deleteTag(tag3.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("Same tag can be added to multiple transactions", async ({
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
    expect(tags1Res.status).toBe(200);
    expect(tags1Res.data!.items!.length).toBe(1);
    expect(tags1Res.data!.items![0].tagName).toBe(tag.data!.name);

    const tags2Res = await transactionAPI.getTransactionTags(
      tx2.data!.id as number
    );
    expect(tags2Res.status).toBe(200);
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
    expect(tags1AfterRes.status).toBe(200);
    expect(tags1AfterRes.data!.items!.length).toBe(0);

    const tags2AfterRes = await transactionAPI.getTransactionTags(
      tx2.data!.id as number
    );
    expect(tags2AfterRes.status).toBe(200);
    expect(tags2AfterRes.data!.items!.length).toBe(1);

    // Cleanup
    await transactionAPI.deleteTransaction(tx1.data!.id as number);
    await transactionAPI.deleteTransaction(tx2.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("Adding duplicate tag to transaction is idempotent", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-dup-tag-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-dup-tag-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `dup-tag-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for duplicate tag test",
    });

    // Add tag first time
    const add1Res = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(add1Res.status).toBe(200);

    // Add same tag again
    const add2Res = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(add2Res.status).toBe(200); // Should succeed (idempotent)

    // Verify only one instance of the tag
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.data!.items!.length).toBe(1);
    expect(tagsRes.data!.items![0].tagName).toBe(tag.data!.name);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("Tags maintain order when added sequentially", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-order-tag-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-order-tag-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tagA = await tagAPI.createTag({
      name: `tag-a-${Date.now()}`,
    });
    const tagB = await tagAPI.createTag({
      name: `tag-b-${Date.now()}`,
    });
    const tagC = await tagAPI.createTag({
      name: `tag-c-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for tag order test",
    });

    // Add tags in specific order
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tagA.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tagB.data!.id as number
    );
    await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tagC.data!.id as number
    );

    // Verify tags are present (order may not be guaranteed by API)
    const tagsRes = await transactionAPI.getTransactionTags(
      tx.data!.id as number
    );
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.data!.items!.length).toBe(3);
    const tagNames = tagsRes.data!.items!.map((t) => t.tagName);
    expect(tagNames).toContain(tagA.data!.name);
    expect(tagNames).toContain(tagB.data!.name);
    expect(tagNames).toContain(tagC.data!.name);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tagA.data!.id as number);
    await tagAPI.deleteTag(tagB.data!.id as number);
    await tagAPI.deleteTag(tagC.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

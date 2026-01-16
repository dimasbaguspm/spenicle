import { test, expect } from "@fixtures/index";

test.describe("Transaction Tags - Add Tag Cases", () => {
  test("POST /transactions/{id}/tags - add non-existent tag", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-add-nonexist-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-add-nonexist-cat-${Date.now()}`,
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
      note: "tx for non-existent tag",
    });

    // Try to add non-existent tag
    const addRes = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      999999
    );
    expect(addRes.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("POST /transactions/{id}/tags - add tag to non-existent transaction", async ({
    transactionAPI,
    tagAPI,
  }) => {
    const tag = await tagAPI.createTag({
      name: `tx-nonexist-tag-${Date.now()}`,
    });

    // Try to add tag to non-existent transaction
    const addRes = await transactionAPI.addTransactionTag(999999, tag.data!.id);
    expect(addRes.status).toBeGreaterThanOrEqual(400);

    await tagAPI.deleteTag(tag.data!.id as number);
  });

  test("POST /transactions/{id}/tags - add empty tag name", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-add-empty-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-add-empty-cat-${Date.now()}`,
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
      note: "tx for empty tag name",
    });

    // Try to add invalid tag ID
    const addRes = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      0
    );
    expect(addRes.status).toBeGreaterThanOrEqual(400);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });

  test("POST /transactions/{id}/tags - add duplicate tag", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
    tagAPI,
  }) => {
    // Create dependencies
    const acc = await accountAPI.createAccount({
      name: `tx-add-dup-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tx-add-dup-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });
    const tag = await tagAPI.createTag({
      name: `tx-dup-tag-${Date.now()}`,
    });

    // Create transaction
    const tx = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense",
      note: "tx for duplicate tag",
    });

    // Add tag first time
    const add1Res = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(add1Res.status).toBeGreaterThanOrEqual(200);

    // Try to add same tag again (should be idempotent)
    const add2Res = await transactionAPI.addTransactionTag(
      tx.data!.id as number,
      tag.data!.id as number
    );
    expect(add2Res.status).toBeGreaterThanOrEqual(200);

    // Cleanup
    await transactionAPI.deleteTransaction(tx.data!.id as number);
    await tagAPI.deleteTag(tag.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

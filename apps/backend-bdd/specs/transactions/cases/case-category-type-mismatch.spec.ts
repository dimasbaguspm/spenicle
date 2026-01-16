import { test, expect } from "@fixtures/index";

test.describe("Transactions - Category Type Mismatch", () => {
  test("using category with mismatched type returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tx-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    // create income category but use for expense transaction
    const cat = await categoryAPI.createCategory({
      name: `tx-cat-${Date.now()}`,
      note: "c",
      type: "income",
    });

    const payload = {
      accountId: acc.data!.id as number,
      amount: 500,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "expense" as const,
    };

    const res = await transactionAPI.createTransaction(payload);
    expect(res.status).toBeGreaterThanOrEqual(400);

    await accountAPI.deleteAccount(acc.data!.id as number);
    await categoryAPI.deleteCategory(cat.data!.id as number);
  });
});

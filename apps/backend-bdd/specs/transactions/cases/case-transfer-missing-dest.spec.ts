import { test, expect } from "@fixtures/index";

test.describe("Transactions - Transfer Validation", () => {
  test("transfer without destination account returns 400", async ({
    transactionAPI,
    accountAPI,
    categoryAPI,
  }) => {
    const acc = await accountAPI.createAccount({
      name: `tm-acc-${Date.now()}`,
      note: "a",
      type: "expense",
    });
    const cat = await categoryAPI.createCategory({
      name: `tm-cat-${Date.now()}`,
      note: "c",
      type: "expense",
    });

    const res = await transactionAPI.createTransaction({
      accountId: acc.data!.id as number,
      amount: 1000,
      categoryId: cat.data!.id as number,
      date: new Date().toISOString(),
      type: "transfer" as const,
      // destinationAccountId is missing
    } as any);

    expect(res.status).toBeGreaterThanOrEqual(400);

    await categoryAPI.deleteCategory(cat.data!.id as number);
    await accountAPI.deleteAccount(acc.data!.id as number);
  });
});

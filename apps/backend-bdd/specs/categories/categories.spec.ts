import { test, expect } from "@fixtures/index";

test.describe("Categories - Common CRUD", () => {
  test("POST /categories - create category", async ({ categoryAPI }) => {
    const name = `e2e-category-create-${Date.now()}`;
    const res = await categoryAPI.createCategory({
      name,
      note: "create test",
      type: "expense",
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
    const id = res.data!.id as number;

    await categoryAPI.deleteCategory(id);
  });

  test("GET /categories - list categories returns items", async ({
    categoryAPI,
  }) => {
    const name = `e2e-category-list-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "list test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const listRes = await categoryAPI.getCategories();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    expect(Array.isArray(items)).toBe(true);

    await categoryAPI.deleteCategory(id);
  });

  test("GET /categories/:id - get category by id", async ({ categoryAPI }) => {
    const name = `e2e-category-get-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "get test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const getRes = await categoryAPI.getCategory(id);
    expect(getRes.status).toBe(200);
    expect(getRes.data!.id).toBe(id);

    await categoryAPI.deleteCategory(id);
  });

  test("PATCH /categories/:id - update category", async ({ categoryAPI }) => {
    const name = `e2e-category-update-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "update test",
      type: "expense",
    });
    const id = created.data!.id as number;

    const newName = name + "-patched";
    const updateRes = await categoryAPI.updateCategory(id, {
      name: newName,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.data!.name).toBe(newName);

    await categoryAPI.deleteCategory(id);
  });

  test("DELETE /categories/:id - delete category", async ({ categoryAPI }) => {
    const name = `e2e-category-delete-${Date.now()}`;
    const created = await categoryAPI.createCategory({
      name,
      note: "delete test",
      type: "expense",
    });

    const delRes = await categoryAPI.deleteCategory(created.data?.id as number);
    expect([200, 204]).toContain(delRes.status);

    const afterGet = await categoryAPI.getCategory(created.data?.id as number);
    expect(afterGet.status).not.toBe(200);
  });

  test("GET /categories - list categories includes embedded budgets", async ({
    categoryAPI,
    budgetAPI,
  }) => {
    const categoryName = `e2e-category-list-budget-${Date.now()}`;
    const categoryRes = await categoryAPI.createCategory({
      name: categoryName,
      note: "list with budget test",
      type: "expense",
    });
    const categoryId = categoryRes.data!.id as number;

    // Create active budget
    const today = new Date();
    const startOfMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const endOfMonth = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );
    const budgetRes = await budgetAPI.createBudget({
      categoryId,
      name: "List Category Budget",
      periodStart: startOfMonth.toISOString(),
      periodEnd: endOfMonth.toISOString(),
      amountLimit: 300,
    });
    const budgetId = budgetRes.data!.id;

    const listRes = await categoryAPI.getCategories();
    expect(listRes.status).toBe(200);
    const items = listRes.data!.items || [];
    const categoryWithBudget = items.find((item) => item.id === categoryId);
    expect(categoryWithBudget).toBeDefined();
    expect(categoryWithBudget!.budget).toBeDefined();
    expect(categoryWithBudget!.budget!.id).toBe(budgetId);
    expect(categoryWithBudget!.budget!.accountId).toBeUndefined();
    expect(categoryWithBudget!.budget!.categoryId).toBe(categoryId);

    // Clean up
    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
  });

  test("GET /categories/:id - category with active budget includes embedded budget", async ({
    categoryAPI,
    budgetAPI,
  }) => {
    const name = `e2e-category-embedded-budget-${Date.now()}`;
    const categoryRes = await categoryAPI.createCategory({
      name,
      note: "embedded budget test",
      type: "expense",
    });
    expect(categoryRes.status).toBe(200);
    const categoryId = categoryRes.data!.id as number;

    // Initially, no embedded budget
    const initialGet = await categoryAPI.getCategory(categoryId);
    expect(initialGet.status).toBe(200);
    expect(initialGet.data!.budget).toBeUndefined();

    // Create an active budget for today
    const today = new Date();
    const startOfMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const endOfMonth = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );

    const budgetRes = await budgetAPI.createBudget({
      categoryId,
      name: "Active Category Budget",
      periodStart: startOfMonth.toISOString(),
      periodEnd: endOfMonth.toISOString(),
      amountLimit: 200,
    });
    expect(budgetRes.status).toBe(200);
    const budgetId = budgetRes.data!.id;

    // Now get category again, should have embedded budget
    const withBudgetGet = await categoryAPI.getCategory(categoryId);
    expect(withBudgetGet.status).toBe(200);
    expect(withBudgetGet.data!.budget).toBeDefined();
    expect(withBudgetGet.data!.budget!.id).toBe(budgetId);
    expect(withBudgetGet.data!.budget!.name).toBe("Active Category Budget");
    expect(withBudgetGet.data!.budget!.amountLimit).toBe(200);
    expect(withBudgetGet.data!.budget!.accountId).toBeUndefined();
    expect(withBudgetGet.data!.budget!.categoryId).toBe(categoryId);

    // Clean up
    await budgetAPI.deleteBudget(budgetId);
    await categoryAPI.deleteCategory(categoryId);
  });
});

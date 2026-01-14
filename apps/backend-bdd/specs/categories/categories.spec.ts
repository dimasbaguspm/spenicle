import { test, expect } from "../../fixtures";

/**
 * Category endpoint tests
 * Tests for /categories endpoints
 */
test.describe("Category API", () => {
  test.describe("POST /categories", () => {
    test("should create a new category with valid data", async ({
      categoryAPI,
    }) => {
      const categoryData = {
        name: "Test Food Category",
        type: "expense" as const,
        icon: "🍔",
        note: "Test category for e2e",
      };

      const response = await categoryAPI.createCategory(categoryData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(categoryData.name);
      expect(response.data?.type).toBe(categoryData.type);
      expect(response.data?.icon).toBe(categoryData.icon);
      expect(response.data?.id).toBeDefined();

      // Cleanup
      if (response.data?.id) {
        await categoryAPI.deleteCategory(response.data.id);
      }
    });

    test("should create category without optional fields", async ({
      categoryAPI,
    }) => {
      const categoryData = {
        name: "Minimal Category",
        type: "income" as const,
        note: "Test note",
      };

      const response = await categoryAPI.createCategory(categoryData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(categoryData.name);

      // Cleanup
      if (response.data?.id) {
        await categoryAPI.deleteCategory(response.data.id);
      }
    });

    test("should fail to create category with invalid data", async ({
      categoryAPI,
    }) => {
      const invalidData = {
        name: "", // Empty name should fail
        type: "expense" as const,
        note: "Test note",
      };

      const response = await categoryAPI.createCategory(invalidData as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();
    });
  });

  test.describe("GET /categories", () => {
    test("should get paginated list of categories", async ({ categoryAPI }) => {
      const response = await categoryAPI.getCategories();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.data).toBeDefined();
      expect(Array.isArray(response.data?.data)).toBe(true);
      expect(response.data?.totalPages).toBeDefined();
    });

    test("should filter categories by search term", async ({ categoryAPI }) => {
      // Create a category with unique name
      const createResponse = await categoryAPI.createCategory({
        name: "UniqueSearchTerm Category",
        type: "expense" as const,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();

      // Search for it
      const response = await categoryAPI.getCategories({
        name: "UniqueSearchTerm",
      });

      expect(response.status).toBe(200);
      expect(response.data?.data).toBeDefined();
      if (response.data?.data) {
        expect(response.data.data.length).toBeGreaterThan(0);
      }

      // Cleanup
      if (createResponse.data?.id) {
        await categoryAPI.deleteCategory(createResponse.data.id);
      }
    });

    test("should paginate categories correctly", async ({ categoryAPI }) => {
      const response = await categoryAPI.getCategories({
        pageNumber: 1,
        pageSize: 5,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.pageNumber).toBe(1);
      expect(response.data?.pageSize).toBe(5);
      if (response.data?.data) {
        expect(response.data.data.length).toBeLessThanOrEqual(5);
      }
    });
  });

  test.describe("GET /categories/:id", () => {
    test("should get a single category by ID", async ({ categoryAPI }) => {
      // Create a category
      const createResponse = await categoryAPI.createCategory({
        name: "Category for Get Test",
        type: "expense" as const,
        icon: "🎯",
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const categoryId = createResponse.data!.id;

      // Get it
      const response = await categoryAPI.getCategory(categoryId);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.id).toBe(categoryId);
      expect(response.data?.name).toBe("Category for Get Test");
      expect(response.data?.icon).toBe("🎯");

      // Cleanup
      await categoryAPI.deleteCategory(categoryId);
    });

    test("should return 404 for non-existent category", async ({
      categoryAPI,
    }) => {
      const response = await categoryAPI.getCategory(999999);

      expect(response.status).toBe(404);
      expect(response.error).toBeDefined();
    });
  });

  test.describe("PATCH /categories/:id", () => {
    test("should update a category successfully", async ({ categoryAPI }) => {
      // Create a category
      const createResponse = await categoryAPI.createCategory({
        name: "Category to Update",
        type: "expense" as const,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const categoryId = createResponse.data!.id;

      // Update it
      const updateData = {
        name: "Updated Category Name",
        icon: "✨",
      };

      const response = await categoryAPI.updateCategory(categoryId, updateData);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(updateData.name);
      expect(response.data?.icon).toBe(updateData.icon);

      // Cleanup
      await categoryAPI.deleteCategory(categoryId);
    });
  });

  test.describe("DELETE /categories/:id", () => {
    test("should delete a category successfully", async ({ categoryAPI }) => {
      // Create a category
      const createResponse = await categoryAPI.createCategory({
        name: "Category to Delete",
        type: "expense" as const,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const categoryId = createResponse.data!.id;

      // Delete it
      const response = await categoryAPI.deleteCategory(categoryId);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Verify it's deleted
      const getResponse = await categoryAPI.getCategory(categoryId);
      expect(getResponse.status).toBe(404);
    });
  });

  test.describe("POST /categories/reorder", () => {
    test("should reorder categories successfully", async ({ categoryAPI }) => {
      // Create multiple categories
      const category1 = await categoryAPI.createCategory({
        name: "Category 1",
        type: "expense" as const,
        note: "Test note 1",
      });

      const category2 = await categoryAPI.createCategory({
        name: "Category 2",
        type: "expense" as const,
        note: "Test note 2",
      });

      expect(category1.data).toBeDefined();
      expect(category2.data).toBeDefined();

      // Reorder them
      const response = await categoryAPI.reorderCategories({
        items: [
          { id: category2.data!.id, displayOrder: 1 },
          { id: category1.data!.id, displayOrder: 2 },
        ],
      });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Cleanup
      await categoryAPI.deleteCategory(category1.data!.id);
      await categoryAPI.deleteCategory(category2.data!.id);
    });
  });

  test.describe("Archive/Unarchive operations", () => {
    test("should archive and unarchive a category", async ({ categoryAPI }) => {
      // Create category
      const createResponse = await categoryAPI.createCategory({
        name: "Category to Archive",
        type: "expense" as const,
        note: "Test note",
      });

      expect(createResponse.data).toBeDefined();
      const categoryId = createResponse.data!.id;

      // Archive it
      const archiveResponse = await categoryAPI.archiveCategory(categoryId);
      expect(archiveResponse.status).toBe(200);
      expect(archiveResponse.data?.archivedAt).toBeDefined();

      // Unarchive it using the helper method
      const unarchiveResponse = await categoryAPI.unarchiveCategory(categoryId);
      expect(unarchiveResponse.status).toBe(200);
      expect(unarchiveResponse.data?.archivedAt).toBeUndefined();

      // Cleanup
      await categoryAPI.deleteCategory(categoryId);
    });
  });
});

/**
 * Category-related schemas for income and expense category management
 */
export const categorySchemas = {
  Category: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Category unique identifier',
      },
      groupId: {
        type: 'integer',
        description: 'Group identifier the category belongs to',
      },
      parentId: {
        type: 'integer',
        nullable: true,
        description: 'Parent category ID for nested categories',
      },
      name: {
        type: 'string',
        maxLength: 100,
        description: 'Category name',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional category notes',
      },
      metadata: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        description: 'Optional metadata for storing custom category information as key-value pairs',
        example: {
          categoryType: 'expense',
          color: '#FF5733',
          icon: 'shopping-cart',
        },
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Category creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Category last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  NewCategory: {
    type: 'object',
    required: ['groupId', 'name'],
    properties: {
      groupId: {
        type: 'integer',
        description: 'Group identifier the category belongs to',
      },
      parentId: {
        type: 'integer',
        nullable: true,
        description: 'Parent category ID for nested categories',
      },
      name: {
        type: 'string',
        maxLength: 100,
        description: 'Category name',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional category notes',
      },
      metadata: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        description: 'Optional metadata for storing custom category information as key-value pairs',
        example: {
          categoryType: 'expense',
          color: '#FF5733',
          icon: 'shopping-cart',
        },
      },
    },
  },
  UpdateCategory: {
    type: 'object',
    properties: {
      parentId: {
        type: 'integer',
        nullable: true,
        description: 'Parent category ID for nested categories',
      },
      name: {
        type: 'string',
        maxLength: 100,
        description: 'Category name',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional category notes',
      },
      metadata: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        description: 'Optional metadata for storing custom category information as key-value pairs',
        example: {
          categoryType: 'expense',
          color: '#FF5733',
          icon: 'shopping-cart',
        },
      },
    },
  },
  CategoryQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by category ID',
          },
          groupId: {
            type: 'integer',
            description: 'Filter by group ID',
          },
          parentId: {
            type: 'integer',
            nullable: true,
            description: 'Filter by parent category ID',
          },
          name: {
            type: 'string',
            description: 'Filter by category name',
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
  PagedCategories: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
      pageNumber: { type: 'integer', example: 1 },
      pageSize: { type: 'integer', example: 25 },
      totalItems: { type: 'integer', example: 100 },
      totalPages: { type: 'integer', example: 4 },
    },
  },
} as const;

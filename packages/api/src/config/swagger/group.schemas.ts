/**
 * Group-related schemas for group management
 */
export const groupSchemas = {
  Group: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Group unique identifier',
      },
      name: {
        type: 'string',
        maxLength: 255,
        description: 'Group name',
      },
      defaultCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Default currency code (3 characters)',
        example: 'USD',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Group creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Group last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  NewGroup: {
    type: 'object',
    required: ['name', 'defaultCurrency'],
    properties: {
      name: {
        type: 'string',
        maxLength: 255,
        description: 'Group name',
      },
      defaultCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Default currency code (3 characters)',
        example: 'USD',
      },
    },
  },
  UpdateGroup: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        maxLength: 255,
        description: 'Group name',
      },
      defaultCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Default currency code (3 characters)',
        example: 'USD',
      },
    },
  },
  GroupQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by group ID',
          },
          name: {
            type: 'string',
            description: 'Filter by group name',
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
  PagedGroups: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/Group' } },
      pageNumber: { type: 'integer', example: 1 },
      pageSize: { type: 'integer', example: 25 },
      totalItems: { type: 'integer', example: 100 },
      totalPages: { type: 'integer', example: 4 },
    },
  },
} as const;

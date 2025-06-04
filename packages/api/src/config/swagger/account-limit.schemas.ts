/**
 * Account limit schemas for spending limits and budget controls
 */
export const accountLimitSchemas = {
  AccountLimit: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Account limit unique identifier',
      },
      accountId: {
        type: 'integer',
        description: 'Account identifier',
      },
      period: {
        type: 'string',
        enum: ['month', 'week'],
        description: 'Limit period',
      },
      limit: {
        type: 'number',
        multipleOf: 0.01,
        minimum: 0,
        description: 'Spending limit amount',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Account limit creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Account limit last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  NewAccountLimit: {
    type: 'object',
    required: ['accountId', 'period', 'limit'],
    properties: {
      accountId: {
        type: 'integer',
        description: 'Account identifier',
      },
      period: {
        type: 'string',
        enum: ['month', 'week'],
        description: 'Limit period',
      },
      limit: {
        type: 'number',
        multipleOf: 0.01,
        minimum: 0,
        description: 'Spending limit amount',
      },
    },
  },
  UpdateAccountLimit: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['month', 'week'],
        description: 'Limit period',
      },
      limit: {
        type: 'number',
        multipleOf: 0.01,
        minimum: 0,
        description: 'Spending limit amount',
      },
    },
  },
  AccountLimitQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by account limit ID',
          },
          accountId: {
            type: 'integer',
            description: 'Filter by account ID',
          },
          period: {
            type: 'string',
            enum: ['month', 'week'],
            description: 'Filter by period',
          },
          sortBy: {
            type: 'string',
            enum: ['period', 'limit', 'startDate', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
} as const;

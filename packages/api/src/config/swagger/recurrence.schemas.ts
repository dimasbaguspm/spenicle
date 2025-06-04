export const recurrenceSchemas = {
  Recurrence: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Recurrence unique identifier',
      },
      userId: {
        type: 'integer',
        description: 'User identifier that owns this recurrence',
      },
      name: {
        type: 'string',
        description: 'Recurrence name',
        example: 'Monthly Salary',
      },
      description: {
        type: 'string',
        description: 'Recurrence description',
        example: 'Salary payment every month',
      },
      frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        description: 'Recurrence frequency',
        example: 'monthly',
      },
      interval: {
        type: 'integer',
        minimum: 1,
        description: 'Interval between occurrences (e.g., every 2 weeks)',
        example: 1,
      },
      nextOccurrenceDate: {
        type: 'string',
        format: 'date-time',
        description: 'Next occurrence date with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for recurrence (optional)',
        example: '2024-12-31T23:59:59Z',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the recurrence is active',
        example: true,
      },
      amount: {
        type: 'number',
        description: 'Transaction amount',
        example: 5000.0,
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Transaction type',
        example: 'income',
      },
      accountId: {
        type: 'integer',
        description: 'Account ID for the transaction',
      },
      categoryId: {
        type: 'integer',
        description: 'Category ID for the transaction',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Recurrence creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Recurrence last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  CreateRecurrence: {
    type: 'object',
    required: [
      'userId',
      'name',
      'frequency',
      'interval',
      'nextOccurrenceDate',
      'amount',
      'type',
      'accountId',
      'categoryId',
    ],
    properties: {
      userId: {
        type: 'integer',
        description: 'User identifier that owns this recurrence',
      },
      name: {
        type: 'string',
        description: 'Recurrence name',
        example: 'Monthly Salary',
      },
      description: {
        type: 'string',
        description: 'Recurrence description',
        example: 'Salary payment every month',
      },
      frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        description: 'Recurrence frequency',
        example: 'monthly',
      },
      interval: {
        type: 'integer',
        minimum: 1,
        description: 'Interval between occurrences (e.g., every 2 weeks)',
        example: 1,
      },
      nextOccurrenceDate: {
        type: 'string',
        format: 'date-time',
        description: 'Next occurrence date with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for recurrence (optional)',
        example: '2024-12-31T23:59:59Z',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the recurrence is active',
        example: true,
        default: true,
      },
      amount: {
        type: 'number',
        description: 'Transaction amount',
        example: 5000.0,
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Transaction type',
        example: 'income',
      },
      accountId: {
        type: 'integer',
        description: 'Account ID for the transaction',
      },
      categoryId: {
        type: 'integer',
        description: 'Category ID for the transaction',
      },
    },
  },
  UpdateRecurrence: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Recurrence name',
        example: 'Monthly Salary',
      },
      description: {
        type: 'string',
        description: 'Recurrence description',
        example: 'Salary payment every month',
      },
      frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        description: 'Recurrence frequency',
        example: 'monthly',
      },
      interval: {
        type: 'integer',
        minimum: 1,
        description: 'Interval between occurrences (e.g., every 2 weeks)',
        example: 1,
      },
      nextOccurrenceDate: {
        type: 'string',
        format: 'date-time',
        description: 'Next occurrence date with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for recurrence (optional)',
        example: '2024-12-31T23:59:59Z',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the recurrence is active',
        example: true,
      },
      amount: {
        type: 'number',
        description: 'Transaction amount',
        example: 5000.0,
      },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        description: 'Transaction type',
        example: 'income',
      },
      accountId: {
        type: 'integer',
        description: 'Account ID for the transaction',
      },
      categoryId: {
        type: 'integer',
        description: 'Category ID for the transaction',
      },
    },
  },
  RecurrenceQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by recurrence ID',
          },
          userId: {
            type: 'integer',
            description: 'Filter by user ID',
          },
          name: {
            type: 'string',
            description: 'Filter by recurrence name (partial match)',
          },
          frequency: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', 'yearly'],
            description: 'Filter by frequency',
          },
          interval: {
            type: 'integer',
            minimum: 1,
            description: 'Filter by interval',
          },
          isActive: {
            type: 'boolean',
            description: 'Filter by active status',
          },
          type: {
            type: 'string',
            enum: ['income', 'expense'],
            description: 'Filter by transaction type',
          },
          accountId: {
            type: 'integer',
            description: 'Filter by account ID',
          },
          categoryId: {
            type: 'integer',
            description: 'Filter by category ID',
          },
          sortBy: {
            type: 'string',
            enum: ['frequency', 'interval', 'nextOccurrenceDate', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
  RefreshTokenQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          userId: {
            type: 'integer',
            description: 'Filter by user ID',
          },
          token: {
            type: 'string',
            description: 'Filter by token value',
          },
          isActive: {
            type: 'boolean',
            description: 'Filter by active status (not revoked)',
          },
          sortBy: {
            type: 'string',
            enum: ['userId', 'expires', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
} as const;

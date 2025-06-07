/**
 * Transaction-related schemas for recording and managing transactions
 */
export const transactionSchemas = {
  Transaction: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Transaction unique identifier',
      },
      groupId: {
        type: 'integer',
        description: 'Group identifier',
      },
      accountId: {
        type: 'integer',
        description: 'Account identifier',
      },
      categoryId: {
        type: 'integer',
        description: 'Category identifier',
      },
      createdByUserId: {
        type: 'integer',
        description: 'User who created the transaction',
      },
      amount: {
        type: 'number',
        multipleOf: 0.01,
        description: 'Transaction amount with 2 decimal precision',
        example: 123.45,
      },
      currency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Currency code (3 characters)',
        example: 'USD',
      },
      type: {
        type: 'string',
        enum: ['expense', 'income', 'transfer'],
        description: 'Transaction type',
        example: 'expense',
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Transaction date with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional transaction notes',
      },
      isHighlighted: {
        type: 'boolean',
        description: 'Whether the transaction is marked as highlighted/important',
        example: false,
        default: false,
      },
      recurrenceId: {
        type: 'integer',
        nullable: true,
        description: 'Recurrence pattern ID if this is a recurring transaction',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Transaction creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Transaction last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  NewTransaction: {
    type: 'object',
    required: ['groupId', 'accountId', 'categoryId', 'createdByUserId', 'amount', 'currency', 'type', 'date'],
    properties: {
      groupId: {
        type: 'integer',
        description: 'Group identifier',
      },
      accountId: {
        type: 'integer',
        description: 'Account identifier',
      },
      categoryId: {
        type: 'integer',
        description: 'Category identifier',
      },
      createdByUserId: {
        type: 'integer',
        description: 'User who created the transaction',
      },
      amount: {
        type: 'number',
        multipleOf: 0.01,
        description: 'Transaction amount with 2 decimal precision',
        example: 123.45,
      },
      currency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Currency code (3 characters)',
        example: 'USD',
      },
      type: {
        type: 'string',
        enum: ['expense', 'income', 'transfer'],
        description: 'Transaction type',
        example: 'expense',
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Transaction date with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional transaction notes',
      },
      recurrenceId: {
        type: 'integer',
        nullable: true,
        description: 'Recurrence pattern ID if this is a recurring transaction',
      },
      isHighlighted: {
        type: 'boolean',
        description: 'Whether the transaction is marked as highlighted/important',
        example: false,
        default: false,
      },
    },
  },
  UpdateTransaction: {
    type: 'object',
    properties: {
      groupId: {
        type: 'integer',
        description: 'Group identifier',
      },
      accountId: {
        type: 'integer',
        description: 'Account identifier',
      },
      categoryId: {
        type: 'integer',
        description: 'Category identifier',
      },
      createdByUserId: {
        type: 'integer',
        description: 'User who created the transaction',
      },
      amount: {
        type: 'number',
        multipleOf: 0.01,
        description: 'Transaction amount with 2 decimal precision',
        example: 123.45,
      },
      currency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Currency code (3 characters)',
        example: 'USD',
      },
      type: {
        type: 'string',
        enum: ['expense', 'income', 'transfer'],
        description: 'Transaction type',
        example: 'expense',
      },
      date: {
        type: 'string',
        format: 'date-time',
        description: 'Transaction date with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional transaction notes',
      },
      recurrenceId: {
        type: 'integer',
        nullable: true,
        description: 'Recurrence pattern ID if this is a recurring transaction',
      },
      isHighlighted: {
        type: 'boolean',
        description: 'Whether the transaction is marked as highlighted/important',
        example: false,
      },
    },
  },
  TransactionQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by transaction ID',
          },
          groupId: {
            type: 'integer',
            description: 'Filter by group ID',
          },
          accountId: {
            type: 'integer',
            description: 'Filter by account ID',
          },
          categoryId: {
            type: 'integer',
            description: 'Filter by category ID',
          },
          createdByUserId: {
            type: 'integer',
            description: 'Filter by user who created the transaction',
          },
          isHighlighted: {
            type: 'boolean',
            description: 'Filter by highlighted status',
            example: true,
          },
          note: {
            type: 'string',
            description: 'Search in transaction notes',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Filter transactions from this date with timezone support',
            example: '2023-12-01T00:00:00Z',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Filter transactions until this date with timezone support',
            example: '2023-12-31T23:59:59Z',
          },
          currency: {
            type: 'string',
            minLength: 3,
            maxLength: 3,
            description: 'Filter by currency code',
          },
          type: {
            type: 'string',
            enum: ['expense', 'income', 'transfer'],
            description: 'Filter by transaction type',
          },
          recurrenceId: {
            type: 'integer',
            description: 'Filter by recurrence ID',
          },
          pageNumber: {
            type: 'integer',
            minimum: 1,
            description: 'Page number for pagination (default: 1)',
            example: 1,
            default: 1,
          },
          pageSize: {
            type: 'integer',
            minimum: 1,
            description: 'Number of items per page (default: 25)',
            example: 25,
            default: 25,
          },
          sortBy: {
            type: 'string',
            enum: ['date', 'amount', 'createdAt'],
            description: 'Field to sort by',
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Sort order',
            example: 'desc',
            default: 'desc',
          },
        },
      },
    ],
  },
  PagedTransactions: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
      pageNumber: { type: 'integer', example: 1 },
      pageSize: { type: 'integer', example: 25 },
      totalItems: { type: 'integer', example: 100 },
      totalPages: { type: 'integer', example: 4 },
    },
  },
} as const;

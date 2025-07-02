export const summarySchemas = {
  SummaryPeriodQueryParameters: {
    allOf: [
      {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time', description: 'Start date (ISO 8601)' },
          endDate: { type: 'string', format: 'date-time', description: 'End date (ISO 8601)' },
          accountId: { type: 'string', description: 'Filter by account ID' },
          categoryId: { type: 'string', description: 'Filter by category ID' },
          sortBy: {
            type: 'string',
            description: 'Sort by field',
            enum: ['totalIncome', 'totalExpenses', 'totalNet', 'netAmount'],
          },
          sortOrder: {
            type: 'string',
            description: 'Sort order',
            enum: ['asc', 'desc'],
          },
        },
      },
    ],
  },
  SummaryCategoriesPeriod: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        categoryId: { type: 'integer', example: 1 },
        startDate: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        endDate: { type: 'string', format: 'date-time', example: '2024-01-31T23:59:59Z' },
        totalIncome: { type: 'number', example: 5000.0 },
        totalExpenses: { type: 'number', example: 3500.0 },
        totalNet: { type: 'number', example: 1500.0 },
        totalTransactions: { type: 'integer', example: 42 },
      },
    },
  },
  SummaryAccountsPeriod: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        accountId: { type: 'integer', example: 2 },
        startDate: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        endDate: { type: 'string', format: 'date-time', example: '2024-01-31T23:59:59Z' },
        totalIncome: { type: 'number', example: 8000.0 },
        totalExpenses: { type: 'number', example: 2000.0 },
        totalNet: { type: 'number', example: 6000.0 },
        totalTransactions: { type: 'integer', example: 30 },
      },
    },
  },
  SummaryTransactionsPeriod: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
        endDate: { type: 'string', format: 'date-time', example: '2024-01-07T23:59:59Z' },
        totalIncome: { type: 'number', example: 2000.0 },
        totalExpenses: { type: 'number', example: 1200.0 },
        netAmount: { type: 'number', example: 800.0 },
        totalTransactions: { type: 'integer', example: 30 },
      },
    },
  },
} as const;

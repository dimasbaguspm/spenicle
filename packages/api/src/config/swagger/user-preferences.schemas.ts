export const userPreferencesSchemas = {
  UserPreference: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'User preference unique identifier',
      },
      userId: {
        type: 'integer',
        description: 'User identifier this preference belongs to',
      },
      monthlyStartDate: {
        type: 'integer',
        minimum: 1,
        maximum: 31,
        description: 'Day of month when monthly periods start (1-31)',
        example: 25,
      },
      weeklyStartDay: {
        type: 'integer',
        minimum: 0,
        maximum: 6,
        description: 'Day of week when weekly periods start (0=Sunday, 1=Monday, ..., 6=Saturday)',
        example: 1,
      },
      limitPeriod: {
        type: 'string',
        enum: ['weekly', 'monthly', 'annually'],
        description: 'Period for spending limits calculation',
        example: 'monthly',
      },
      categoryPeriod: {
        type: 'string',
        enum: ['weekly', 'monthly', 'annually'],
        description: 'Period for category spending calculation',
        example: 'monthly',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Preference creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Preference last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  CreateUserPreference: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'integer',
        description: 'User identifier this preference belongs to',
      },
      monthlyStartDate: {
        type: 'integer',
        minimum: 1,
        maximum: 31,
        description: 'Day of month when monthly periods start (1-31)',
        example: 25,
        default: 25,
      },
      weeklyStartDay: {
        type: 'integer',
        minimum: 0,
        maximum: 6,
        description: 'Day of week when weekly periods start (0=Sunday, 1=Monday, ..., 6=Saturday)',
        example: 1,
        default: 1,
      },
      limitPeriod: {
        type: 'string',
        enum: ['weekly', 'monthly', 'annually'],
        description: 'Period for spending limits calculation',
        example: 'monthly',
        default: 'monthly',
      },
      categoryPeriod: {
        type: 'string',
        enum: ['weekly', 'monthly', 'annually'],
        description: 'Period for category spending calculation',
        example: 'monthly',
        default: 'monthly',
      },
    },
  },
  UpdateUserPreference: {
    type: 'object',
    properties: {
      monthlyStartDate: {
        type: 'integer',
        minimum: 1,
        maximum: 31,
        description: 'Day of month when monthly periods start (1-31)',
        example: 25,
      },
      weeklyStartDay: {
        type: 'integer',
        minimum: 0,
        maximum: 6,
        description: 'Day of week when weekly periods start (0=Sunday, 1=Monday, ..., 6=Saturday)',
        example: 1,
      },
      limitPeriod: {
        type: 'string',
        enum: ['weekly', 'monthly', 'annually'],
        description: 'Period for spending limits calculation',
        example: 'monthly',
      },
      categoryPeriod: {
        type: 'string',
        enum: ['weekly', 'monthly', 'annually'],
        description: 'Period for category spending calculation',
        example: 'monthly',
      },
    },
  },
  UserPreferenceQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by preference ID',
          },
          userId: {
            type: 'integer',
            description: 'Filter by user ID',
          },
          monthlyStartDate: {
            type: 'integer',
            minimum: 1,
            maximum: 31,
            description: 'Filter by monthly start date',
          },
          weeklyStartDay: {
            type: 'integer',
            minimum: 0,
            maximum: 6,
            description: 'Filter by weekly start day',
          },
          limitPeriod: {
            type: 'string',
            enum: ['weekly', 'monthly', 'annually'],
            description: 'Filter by limit period',
          },
          categoryPeriod: {
            type: 'string',
            enum: ['weekly', 'monthly', 'annually'],
            description: 'Filter by category period',
          },
          sortBy: {
            type: 'string',
            enum: ['userId', 'monthlyStartDate', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
} as const;

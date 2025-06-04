/**
 * User-related schemas for user management and profiles
 */
export const userSchemas = {
  User: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'User unique identifier',
      },
      groupId: {
        type: 'integer',
        description: 'Group identifier the user belongs to',
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
        description: 'User email address',
      },
      name: {
        type: 'string',
        maxLength: 255,
        description: 'User full name',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the user is active',
      },
      isOnboard: {
        type: 'boolean',
        description: 'Whether the user has completed the onboarding process',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'User creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'User last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  NewUser: {
    type: 'object',
    required: ['groupId', 'email', 'passwordHash', 'name', 'isActive', 'isOnboard'],
    properties: {
      groupId: {
        type: 'integer',
        description: 'Group identifier the user belongs to',
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
        description: 'User email address',
      },
      passwordHash: {
        type: 'string',
        maxLength: 255,
        description: 'User password hash',
      },
      name: {
        type: 'string',
        maxLength: 255,
        description: 'User full name',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the user is active',
      },
      isOnboard: {
        type: 'boolean',
        description: 'Whether the user has completed the onboarding process',
        default: false,
      },
    },
  },
  UpdateUser: {
    type: 'object',
    properties: {
      groupId: {
        type: 'integer',
        description: 'Group identifier the user belongs to',
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
        description: 'User email address',
      },
      passwordHash: {
        type: 'string',
        maxLength: 255,
        description: 'User password hash',
      },
      name: {
        type: 'string',
        maxLength: 255,
        description: 'User full name',
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the user is active',
      },
      isOnboard: {
        type: 'boolean',
        description: 'Whether the user has completed the onboarding process',
      },
    },
  },
  UserQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by user ID',
          },
          groupId: {
            type: 'integer',
            description: 'Filter by group ID',
          },
          email: {
            type: 'string',
            description: 'Filter by email address',
          },
          name: {
            type: 'string',
            description: 'Filter by user name',
          },
          isActive: {
            type: 'boolean',
            description: 'Filter by active status',
          },
          isOnboard: {
            type: 'boolean',
            description: 'Filter by onboarding status',
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'email', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
} as const;

/**
 * Account-related schemas for account management
 */
export const accountSchemas = {
  Account: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        description: 'Account unique identifier',
      },
      groupId: {
        type: 'integer',
        description: 'Group identifier the account belongs to',
      },
      name: {
        type: 'string',
        maxLength: 255,
        description: 'Account name',
      },
      type: {
        type: 'string',
        maxLength: 50,
        description: 'Account type (e.g., checking, savings, credit, cash)',
        example: 'checking',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional account notes',
      },
      metadata: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        description: 'Optional metadata for storing custom account information as key-value pairs',
        example: {
          bankName: 'Chase Bank',
          accountNumber: '****1234',
          routingNumber: '123456789',
        },
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Account creation timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Account last update timestamp with timezone support',
        example: '2023-12-01T10:30:00Z',
      },
    },
  },
  NewAccount: {
    type: 'object',
    required: ['groupId', 'name', 'type'],
    properties: {
      groupId: {
        type: 'integer',
        description: 'Group identifier the account belongs to',
      },
      name: {
        type: 'string',
        maxLength: 255,
        description: 'Account name',
      },
      type: {
        type: 'string',
        maxLength: 50,
        description: 'Account type (e.g., checking, savings, credit, cash)',
        example: 'checking',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional account notes',
      },
      metadata: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        description: 'Optional metadata for storing custom account information as key-value pairs',
        example: {
          bankName: 'Chase Bank',
          accountNumber: '****1234',
          routingNumber: '123456789',
        },
      },
    },
  },
  UpdateAccount: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        maxLength: 255,
        description: 'Account name',
      },
      type: {
        type: 'string',
        maxLength: 50,
        description: 'Account type (e.g., checking, savings, credit, cash)',
        example: 'checking',
      },
      note: {
        type: 'string',
        nullable: true,
        description: 'Optional account notes',
      },
      metadata: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        description: 'Optional metadata for storing custom account information as key-value pairs',
        example: {
          bankName: 'Chase Bank',
          accountNumber: '****1234',
          routingNumber: '123456789',
        },
      },
    },
  },
  AccountQueryParameters: {
    allOf: [
      { $ref: '#/components/schemas/QueryParameters' },
      {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Filter by account ID',
          },
          groupId: {
            type: 'integer',
            description: 'Filter by group ID',
          },
          name: {
            type: 'string',
            description: 'Filter by account name',
          },
          type: {
            type: 'string',
            description: 'Filter by account type',
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'type', 'createdAt'],
            description: 'Field to sort by',
          },
        },
      },
    ],
  },
} as const;

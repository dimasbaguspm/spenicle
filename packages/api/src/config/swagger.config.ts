import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpendLess API',
      version: '1.0.0',
      description: 'A comprehensive expense tracking and budget management API',
      contact: {
        name: 'Dimas Bagus P',
        email: 'dimas.bagus.pm1@gmail.com',
      },
    },
    servers: [
      {
        url:
          process.env.API_STAGE === 'production'
            ? 'https://your-production-domain.com/api'
            : `http://localhost:${process.env.API_PORT ?? 3000}/api`,
        description: process.env.API_STAGE === 'production' ? 'Production server' : 'Development server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and registration endpoints',
      },
      {
        name: 'Users',
        description: 'User profile management',
      },
      {
        name: 'Groups',
        description: 'Group management and user invitations',
      },
      {
        name: 'Accounts',
        description: 'Account management (savings, checking, credit, cash)',
      },
      {
        name: 'Account Limits',
        description: 'Spending limits and budget controls',
      },
      {
        name: 'Categories',
        description: 'Income and expense category management',
      },
      {
        name: 'Transactions',
        description: 'Transaction recording and management',
      },
      {
        name: 'Summary',
        description: 'Financial summaries and reporting',
      },
      {
        name: 'Health',
        description: 'API health check endpoints',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT Bearer token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['status', 'message'],
          properties: {
            status: {
              type: 'integer',
              description: 'HTTP status code',
              example: 400,
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed',
            },
            details: {
              type: 'object',
              additionalProperties: true,
              description: 'Additional error details (optional)',
              example: {
                field: 'email',
                issue: 'invalid format',
              },
            },
          },
        },
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
                bankCode: 'ABC123',
                accountNumber: '1234567890',
                branch: 'Main Branch',
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
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
            expiresIn: {
              type: 'number',
              description: 'Access token expiration time in seconds',
            },
          },
        },
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
        Recurrence: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Recurrence unique identifier',
            },
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
              description: 'Recurrence frequency',
            },
            interval: {
              type: 'integer',
              minimum: 1,
              description: 'Interval between recurrences',
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
              nullable: true,
              description: 'End date for recurrence with timezone support',
              example: '2023-12-31T23:59:59Z',
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
        RefreshToken: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Refresh token unique identifier',
            },
            userId: {
              type: 'integer',
              description: 'User identifier',
            },
            token: {
              type: 'string',
              description: 'Refresh token value',
            },
            expires: {
              type: 'string',
              format: 'date-time',
              description: 'Token expiration timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Token creation timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            revokedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Token revocation timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            replacedByToken: {
              type: 'string',
              nullable: true,
              description: 'Token that replaced this one',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {},
              description: 'Array of items',
            },
            pageNumber: {
              type: 'integer',
              description: 'Current page number',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of items per page',
            },
            totalItems: {
              type: 'integer',
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
          },
        },
        PagedGroups: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Group' },
                },
              },
            },
          ],
        },
        PagedUsers: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          ],
        },
        PagedAccounts: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Account' },
                },
              },
            },
          ],
        },
        PagedAccountLimits: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/AccountLimit' },
                },
              },
            },
          ],
        },
        PagedCategories: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Category' },
                },
              },
            },
          ],
        },
        PagedRecurrences: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Recurrence' },
                },
              },
            },
          ],
        },
        PagedTransactions: {
          allOf: [
            { $ref: '#/components/schemas/PaginatedResponse' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Transaction' },
                },
              },
            },
          ],
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
        UserRegistration: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              maxLength: 255,
              description: 'User full name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password (minimum 8 characters)',
              example: 'securePassword123',
            },
          },
        },
        GroupRegistration: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              maxLength: 255,
              description: 'Group name',
              example: 'Doe Family Budget',
            },
            defaultCurrency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              nullable: true,
              description: 'Default currency for the group (3-letter code)',
              example: 'USD',
            },
          },
        },
        RegistrationRequest: {
          type: 'object',
          required: ['user', 'group'],
          properties: {
            user: {
              $ref: '#/components/schemas/UserRegistration',
            },
            group: {
              $ref: '#/components/schemas/GroupRegistration',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: 'securePassword123',
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
                bankCode: 'ABC123',
                accountNumber: '1234567890',
                branch: 'Main Branch',
              },
            },
          },
        },
        UpdateAccount: {
          type: 'object',
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
                bankCode: 'ABC123',
                accountNumber: '1234567890',
                branch: 'Main Branch',
              },
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
        NewRecurrence: {
          type: 'object',
          required: ['frequency', 'interval', 'nextOccurrenceDate'],
          properties: {
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
              description: 'Recurrence frequency',
            },
            interval: {
              type: 'integer',
              minimum: 1,
              description: 'Interval between recurrences',
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
              nullable: true,
              description: 'End date for recurrence with timezone support',
              example: '2023-12-31T23:59:59Z',
            },
          },
        },
        UpdateRecurrence: {
          type: 'object',
          properties: {
            frequency: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly', 'yearly'],
              description: 'Recurrence frequency',
            },
            interval: {
              type: 'integer',
              minimum: 1,
              description: 'Interval between recurrences',
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
              nullable: true,
              description: 'End date for recurrence with timezone support',
              example: '2023-12-31T23:59:59Z',
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
              default: false,
            },
          },
        },
        NewRefreshToken: {
          type: 'object',
          required: ['userId', 'token', 'expires'],
          properties: {
            userId: {
              type: 'integer',
              description: 'User identifier',
            },
            token: {
              type: 'string',
              description: 'Refresh token value',
            },
            expires: {
              type: 'string',
              format: 'date-time',
              description: 'Token expiration timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            revokedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Token revocation timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            replacedByToken: {
              type: 'string',
              nullable: true,
              description: 'Token that replaced this one',
            },
          },
        },
        UpdateRefreshToken: {
          type: 'object',
          properties: {
            userId: {
              type: 'integer',
              description: 'User identifier',
            },
            token: {
              type: 'string',
              description: 'Refresh token value',
            },
            expires: {
              type: 'string',
              format: 'date-time',
              description: 'Token expiration timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            revokedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Token revocation timestamp with timezone support',
              example: '2023-12-01T10:30:00Z',
            },
            replacedByToken: {
              type: 'string',
              nullable: true,
              description: 'Token that replaced this one',
            },
          },
        },
        QueryParameters: {
          type: 'object',
          properties: {
            pageNumber: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Page number for pagination',
            },
            pageSize: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 25,
              description: 'Number of items per page',
            },
            sortBy: {
              type: 'string',
              description: 'Field to sort by',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
              description: 'Sort order',
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
                  format: 'email',
                  description: 'Filter by email',
                },
                name: {
                  type: 'string',
                  description: 'Filter by name',
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
                recurrenceId: {
                  type: 'integer',
                  description: 'Filter by recurrence ID',
                },
                sortBy: {
                  type: 'string',
                  enum: ['date', 'amount', 'createdAt'],
                  description: 'Field to sort by',
                },
                isHighlighted: {
                  type: 'boolean',
                  description: 'Filter by highlighted status',
                  example: true,
                },
              },
            },
          ],
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
                frequency: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly', 'yearly'],
                  description: 'Filter by frequency',
                },
                startDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filter recurrences starting from this date with timezone support',
                  example: '2023-12-01T00:00:00Z',
                },
                endDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Filter recurrences ending before this date with timezone support',
                  example: '2023-12-31T23:59:59Z',
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
        SummaryPeriodQueryParameters: {
          allOf: [
            { $ref: '#/components/schemas/QueryParameters' },
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
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

/**
 * Authentication-related schemas for login, registration, and token management
 */
export const authSchemas = {
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
        example: 'Family Budget',
      },
      defaultCurrency: {
        type: 'string',
        minLength: 3,
        maxLength: 3,
        description: 'Default currency code (3 characters)',
        example: 'USD',
        default: 'USD',
      },
    },
  },
  RegistrationWithGroup: {
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
        description: 'User password',
        example: 'securePassword123',
      },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      accessToken: {
        type: 'string',
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      refreshToken: {
        type: 'string',
        description: 'JWT refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      user: {
        $ref: '#/components/schemas/User',
      },
    },
  },
  LogoutResponse: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Success message',
        example: 'Logged out successfully',
      },
    },
  },
  RefreshTokenRequest: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: {
        type: 'string',
        description: 'JWT refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  },
} as const;

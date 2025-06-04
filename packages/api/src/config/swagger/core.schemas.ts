/**
 * Core and common schemas used throughout the API
 */
export const coreSchemas = {
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
  QueryParameters: {
    type: 'object',
    properties: {
      pageNumber: {
        type: 'integer',
        minimum: 1,
        description: 'Page number for pagination',
        example: 1,
        default: 1,
      },
      pageSize: {
        type: 'integer',
        minimum: 1,
        description: 'Number of items per page',
        example: 25,
        default: 25,
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order',
        example: 'asc',
        default: 'asc',
      },
    },
  },
} as const;

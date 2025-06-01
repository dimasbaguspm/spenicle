import { Response } from 'express';

import { isHttpException } from '../exceptions/index.ts';

export const getErrorResponse = (response: Response, error: unknown) => {
  if (isHttpException(error)) {
    return response.status(error.status).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  console.error('Unexpected error:', error);
  return response.status(500).json({
    message: 'Internal server error',
  });
};

export const getCreatedResponse = (response: Response) => {
  return response.status(201).json({
    message: 'Resource created successfully',
  });
};

export const getNoContentResponse = (response: Response) => {
  return response.status(204).send();
};

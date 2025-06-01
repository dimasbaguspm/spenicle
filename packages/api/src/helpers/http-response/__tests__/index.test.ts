import { Response } from 'express';
import { vi, Mock } from 'vitest';

import {
  HttpException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '../../exceptions/index.ts';
import { getErrorResponse, getCreatedResponse, getNoContentResponse } from '../index.ts';

// Mock console.error to avoid console output during tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('getErrorResponse', () => {
  let mockResponse: Partial<Response>;
  let mockStatus: Mock;
  let mockJson: Mock;

  beforeEach(() => {
    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should handle HttpException with details', () => {
    const error = new HttpException(400, 'Bad request', { field: 'email' });

    getErrorResponse(mockResponse as Response, error);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Bad request',
      details: { field: 'email' },
    });
  });

  it('should handle HttpException without details', () => {
    const error = new HttpException(404, 'Not found');

    getErrorResponse(mockResponse as Response, error);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Not found',
    });
  });

  it('should handle NotFoundException', () => {
    const error = new NotFoundException('Resource not found', { id: '123' });

    getErrorResponse(mockResponse as Response, error);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Resource not found',
      details: { id: '123' },
    });
  });

  it('should handle BadRequestException', () => {
    const error = new BadRequestException('Invalid input');

    getErrorResponse(mockResponse as Response, error);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Invalid input',
    });
  });

  it('should handle UnauthorizedException', () => {
    const error = new UnauthorizedException('Access denied', { reason: 'invalid_token' });

    getErrorResponse(mockResponse as Response, error);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Access denied',
      details: { reason: 'invalid_token' },
    });
  });

  it('should handle non-HttpException errors', () => {
    const error = new Error('Regular error');

    getErrorResponse(mockResponse as Response, error);

    expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error:', error);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });

  it('should handle null error', () => {
    getErrorResponse(mockResponse as Response, null);

    expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error:', null);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });

  it('should handle undefined error', () => {
    getErrorResponse(mockResponse as Response, undefined);

    expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error:', undefined);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });

  it('should handle string error', () => {
    const error = 'String error';

    getErrorResponse(mockResponse as Response, error);

    expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error:', error);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });

  it('should handle object error without HttpException properties', () => {
    const error = { code: 'CUSTOM_ERROR', info: 'Some info' };

    getErrorResponse(mockResponse as Response, error);

    expect(mockConsoleError).toHaveBeenCalledWith('Unexpected error:', error);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });

  it('should return the response object', () => {
    const error = new HttpException(400, 'Bad request');
    const result = getErrorResponse(mockResponse as Response, error);

    expect(result).toBe(mockResponse?.status?.(400).json());
  });
});

describe('getCreatedResponse', () => {
  let mockResponse: Partial<Response>;
  let mockStatus: Mock;
  let mockJson: Mock;

  beforeEach(() => {
    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  it('should return 201 status with success message', () => {
    getCreatedResponse(mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'Resource created successfully',
    });
  });

  it('should return the response object', () => {
    const result = getCreatedResponse(mockResponse as Response);

    expect(result).toBe(mockResponse?.status?.(201).json());
  });
});

describe('getNoContentResponse', () => {
  let mockResponse: Partial<Response>;
  let mockStatus: Mock;
  let mockSend: Mock;

  beforeEach(() => {
    mockSend = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnValue({ send: mockSend });
    mockResponse = {
      status: mockStatus,
      send: mockSend,
    };
  });

  it('should return 204 status with no content', () => {
    getNoContentResponse(mockResponse as Response);

    expect(mockStatus).toHaveBeenCalledWith(204);
    expect(mockSend).toHaveBeenCalledWith();
  });

  it('should return the response object', () => {
    const result = getNoContentResponse(mockResponse as Response);

    expect(result).toBe(mockResponse?.status?.(204).send());
  });
});

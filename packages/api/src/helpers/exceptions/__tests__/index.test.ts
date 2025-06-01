import {
  HttpException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  MethodNotAllowedException,
  NotAcceptableException,
  RequestTimeoutException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  InternalServerErrorException,
  isHttpException,
} from '../index.ts';

describe('HttpException', () => {
  it('should create an instance with status, message and details', () => {
    const status = 500;
    const message = 'Internal Server Error';
    const details = { code: 'INTERNAL_ERROR' };

    const exception = new HttpException(status, message, details);

    expect(exception).toBeInstanceOf(Error);
    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(status);
    expect(exception.message).toBe(message);
    expect(exception.details).toEqual(details);
    expect(exception.name).toBe('HttpException');
    expect(exception.stack).toBeDefined();
  });

  it('should create an instance without details', () => {
    const status = 404;
    const message = 'Not Found';

    const exception = new HttpException(status, message);

    expect(exception.status).toBe(status);
    expect(exception.message).toBe(message);
    expect(exception.details).toBeUndefined();
  });

  it('should set the correct name property', () => {
    const exception = new HttpException(500, 'Test error');
    expect(exception.name).toBe('HttpException');
  });

  it('should capture stack trace', () => {
    const exception = new HttpException(500, 'Test error');
    expect(exception.stack).toBeDefined();
    expect(exception.stack).toContain('HttpException');
  });
});

describe('UnauthorizedException', () => {
  it('should create an instance with status 401', () => {
    const message = 'Unauthorized access';
    const details = { reason: 'Invalid token' };

    const exception = new UnauthorizedException(message, details);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(401);
    expect(exception.message).toBe(message);
    expect(exception.details).toEqual(details);
    expect(exception.name).toBe('UnauthorizedException');
  });

  it('should create an instance without details', () => {
    const message = 'Unauthorized';
    const exception = new UnauthorizedException(message);

    expect(exception.status).toBe(401);
    expect(exception.message).toBe(message);
    expect(exception.details).toBeUndefined();
  });
});

describe('NotFoundException', () => {
  it('should create an instance with status 404', () => {
    const message = 'Resource not found';
    const details = { resource: 'user', id: '123' };

    const exception = new NotFoundException(message, details);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(404);
    expect(exception.message).toBe(message);
    expect(exception.details).toEqual(details);
    expect(exception.name).toBe('NotFoundException');
  });
});

describe('BadRequestException', () => {
  it('should create an instance with status 400', () => {
    const message = 'Bad request';
    const details = { field: 'email', issue: 'invalid format' };

    const exception = new BadRequestException(message, details);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(400);
    expect(exception.message).toBe(message);
    expect(exception.details).toEqual(details);
    expect(exception.name).toBe('BadRequestException');
  });
});

describe('ForbiddenException', () => {
  it('should create an instance with status 403', () => {
    const message = 'Forbidden';
    const exception = new ForbiddenException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(403);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('ForbiddenException');
  });
});

describe('MethodNotAllowedException', () => {
  it('should create an instance with status 405', () => {
    const message = 'Method not allowed';
    const exception = new MethodNotAllowedException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(405);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('MethodNotAllowedException');
  });
});

describe('NotAcceptableException', () => {
  it('should create an instance with status 406', () => {
    const message = 'Not acceptable';
    const exception = new NotAcceptableException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(406);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('NotAcceptableException');
  });
});

describe('RequestTimeoutException', () => {
  it('should create an instance with status 408', () => {
    const message = 'Request timeout';
    const exception = new RequestTimeoutException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(408);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('RequestTimeoutException');
  });
});

describe('ConflictException', () => {
  it('should create an instance with status 409', () => {
    const message = 'Conflict';
    const exception = new ConflictException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(409);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('ConflictException');
  });
});

describe('GoneException', () => {
  it('should create an instance with status 410', () => {
    const message = 'Gone';
    const exception = new GoneException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(410);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('GoneException');
  });
});

describe('PayloadTooLargeException', () => {
  it('should create an instance with status 413', () => {
    const message = 'Payload too large';
    const exception = new PayloadTooLargeException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(413);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('PayloadTooLargeException');
  });
});

describe('UnsupportedMediaTypeException', () => {
  it('should create an instance with status 415', () => {
    const message = 'Unsupported media type';
    const exception = new UnsupportedMediaTypeException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(415);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('UnsupportedMediaTypeException');
  });
});

describe('InternalServerErrorException', () => {
  it('should create an instance with status 500', () => {
    const message = 'Internal server error';
    const exception = new InternalServerErrorException(message);

    expect(exception).toBeInstanceOf(HttpException);
    expect(exception.status).toBe(500);
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('InternalServerErrorException');
  });
});

describe('isHttpException', () => {
  it('should return true for HttpException instances', () => {
    const exception = new HttpException(500, 'Test error');
    expect(isHttpException(exception)).toBe(true);
  });

  it('should return true for exception subclasses', () => {
    const notFoundException = new NotFoundException('Not found');
    const badRequestException = new BadRequestException('Bad request');
    const unauthorizedException = new UnauthorizedException('Unauthorized');

    expect(isHttpException(notFoundException)).toBe(true);
    expect(isHttpException(badRequestException)).toBe(true);
    expect(isHttpException(unauthorizedException)).toBe(true);
  });

  it('should return false for regular Error instances', () => {
    const error = new Error('Regular error');
    expect(isHttpException(error)).toBe(false);
  });

  it('should return false for non-error objects', () => {
    expect(isHttpException(null)).toBe(false);
    expect(isHttpException(undefined)).toBe(false);
    expect(isHttpException({})).toBe(false);
    expect(isHttpException('string')).toBe(false);
    expect(isHttpException(123)).toBe(false);
    expect(isHttpException([])).toBe(false);
  });

  it('should return false for objects with similar properties but not HttpException', () => {
    const fakeException = {
      status: 404,
      message: 'Not found',
      details: {},
    };
    expect(isHttpException(fakeException)).toBe(false);
  });
});

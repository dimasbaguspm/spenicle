export class HttpException extends Error {
  public status: number;
  public message: string;
  public details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.message = message;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(401, message, details);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(404, message, details);
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, details);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(403, message, details);
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(405, message, details);
  }
}

export class NotAcceptableException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(406, message, details);
  }
}

export class RequestTimeoutException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(408, message, details);
  }
}

export class ConflictException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, message, details);
  }
}

export class GoneException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(410, message, details);
  }
}

export class PayloadTooLargeException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(413, message, details);
  }
}

export class UnsupportedMediaTypeException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(415, message, details);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(500, message, details);
  }
}

export const isHttpException = (error: unknown): error is HttpException => {
  return error instanceof HttpException;
};

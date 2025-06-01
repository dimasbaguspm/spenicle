import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    status: 'ERROR',
    message: 'Resource not found',
    path: req.url,
  });
};

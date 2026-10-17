import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Multer upload errors
  if (err instanceof MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum permitted limit (5 MB).';
    } else {
      message = `Upload error: ${err.message}`;
    }
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Handle Prisma Known Request Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = process.env.NODE_ENV === 'development' ? err.message : 'Database operation failed';
  }

  // Log the error for audit and debugging
  console.error(`[Error] ${req.method} ${req.url} >> ${message}`, err.stack);
  logger.error(`[${req.method}] ${req.originalUrl || req.url} - Status: ${statusCode} - Error: ${message}`, {
    stack: err.stack,
    details: err.details,
  });

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    error: message,
    ...(err instanceof ZodError && {
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    }),
    ...(err.details && !(err instanceof ZodError) && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Alias for backwards compatibility
export const errorHandler = globalErrorHandler;

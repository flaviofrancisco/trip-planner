import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  const status = err.status || 500;
  console.error(err);
  res.status(status).json({ error: err.message || 'Server error' });
}

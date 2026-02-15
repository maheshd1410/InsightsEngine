import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function RequestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.header('x-correlation-id') ?? randomUUID();
  res.setHeader('x-correlation-id', correlationId);
  next();
}

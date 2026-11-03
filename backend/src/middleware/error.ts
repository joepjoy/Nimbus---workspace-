import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../utils/env';
import { HttpError } from '../utils/http';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.path}` } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, error: { message: err.message, details: err.details } });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: { message: 'A record with these details already exists' } });
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: { message: 'Record not found' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { message: 'Invalid JSON body' } });
  }
  console.error(err);
  // Never leak internals in production.
  res.status(500).json({
    success: false,
    error: { message: env.isProd ? 'Internal server error' : String(err?.message ?? err) },
  });
};

import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http';

/** Tiny in-memory limiter for auth endpoints (per IP). Fine for a single instance. */
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return next(new HttpError(429, 'Too many attempts. Please try again later.'));
    next();
  };
}

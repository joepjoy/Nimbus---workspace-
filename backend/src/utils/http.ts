import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** Consistent success envelope: { success: true, data } */
export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** Validate input with zod; throws a 400 HttpError with a readable message. */
export function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'body';
      fields[key] ??= issue.message;
    }
    const first = result.error.issues[0];
    const label = first.path.length ? `${first.path.join('.')}: ` : '';
    throw new HttpError(400, `${label}${first.message}`, fields);
  }
  return result.data;
}

/** Optional date field: accepts ISO strings / yyyy-mm-dd, empty string or null clears it. */
export const dateField = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.coerce.date().nullable().optional(),
);

export const optionalText = (max: number) =>
  z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(max).nullable().optional());

export function param(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value !== 'string') throw new HttpError(400, `Missing parameter: ${key}`);
  return value;
}

export function query(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

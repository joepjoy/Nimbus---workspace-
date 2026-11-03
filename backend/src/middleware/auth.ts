import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';
import { HttpError } from '../utils/http';
import { prisma } from '../utils/prisma';

export const COOKIE_NAME = 'nimbus_token';

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const token: string | undefined = req.cookies?.[COOKIE_NAME] ?? bearer;
    if (!token) throw new HttpError(401, 'Authentication required');

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, 'Session expired. Please sign in again.');
    }
    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) }, select: { id: true } });
    if (!user) throw new HttpError(401, 'Account no longer exists');
    req.userId = user.id;
    next();
  } catch (err) {
    next(err);
  }
}

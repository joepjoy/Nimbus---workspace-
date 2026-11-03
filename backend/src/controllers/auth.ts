import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { CookieOptions } from 'express';
import { z } from 'zod';
import { COOKIE_NAME, signToken } from '../middleware/auth';
import { env } from '../utils/env';
import { asyncHandler, HttpError, ok, optionalText, parse } from '../utils/http';
import { prisma } from '../utils/prisma';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const publicUser = { id: true, name: true, email: true, bio: true, createdAt: true } as const;

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const data = parse(z.object({ name: z.string().trim().min(2, 'Name is too short').max(80), email, password }), req.body);
  if (await prisma.user.findUnique({ where: { email: data.email } })) {
    throw new HttpError(409, 'An account with this email already exists');
  }
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12) },
    select: publicUser,
  });
  res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
  ok(res, { user }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const data = parse(z.object({ email, password: z.string().min(1, 'Password is required') }), req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  // Same message for unknown email and wrong password.
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
  ok(res, { user: { id: user.id, name: user.name, email: user.email, bio: user.bio, createdAt: user.createdAt } });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  ok(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: publicUser });
  ok(res, { user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const data = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), bio: optionalText(300) }), req.body);
  const user = await prisma.user.update({ where: { id: req.userId }, data, select: publicUser });
  ok(res, { user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const data = parse(z.object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: password }), req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } });
  ok(res, { message: 'Password updated' });
});

/**
 * Password reset without an email service: a one-time token is generated and stored hashed.
 * In development the reset link is returned in the response (and logged) so the flow can be demoed.
 * In production, plug an email provider in here and stop returning the link.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const data = parse(z.object({ email }), req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const response: { message: string; resetUrl?: string } = {
    message: 'If an account exists for that email, a reset link has been generated.',
  };
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
    if (!env.isProd) {
      console.log(`[password reset] ${data.email}: ${resetUrl}`);
      response.resetUrl = resetUrl;
    }
  }
  ok(res, response);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = parse(z.object({ token: z.string().min(10), newPassword: password }), req.body);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'This reset link is invalid or has expired');
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  ok(res, { message: 'Password has been reset. You can now sign in.' });
});

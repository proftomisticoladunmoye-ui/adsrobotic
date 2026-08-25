import { prisma, type Session, type User } from '@adsrobotic/db';
import { generateSessionToken, hashToken } from './crypto';

/**
 * Server-side session management (Spec §21). The raw token is returned to the
 * caller once (to set as an HttpOnly cookie); only its hash is stored.
 */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  ctx: SessionContext = {},
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
  return { token, expiresAt };
}

export interface ValidatedSession {
  session: Session;
  user: User;
}

export async function validateSession(token: string): Promise<ValidatedSession | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.status === 'suspended') return null;
  const { user, ...rest } = session;
  return { session: rest as Session, user };
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
}

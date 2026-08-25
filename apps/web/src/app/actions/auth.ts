'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  authenticate,
  createSession,
  registerUser,
  revokeSession,
  toErrorPayload,
} from '@adsrobotic/core';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session-cookie';

export interface ActionState {
  error?: string;
}

async function startSession(userId: string) {
  const h = await headers();
  const session = await createSession(userId, {
    ip: h.get('x-forwarded-for') ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user } = await registerUser({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      name: String(formData.get('name') ?? '') || undefined,
      businessName: String(formData.get('businessName') ?? ''),
    });
    await startSession(user.id);
  } catch (err) {
    return { error: toErrorPayload(err).message };
  }
  redirect('/onboarding');
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await authenticate(
      String(formData.get('email') ?? ''),
      String(formData.get('password') ?? ''),
    );
    await startSession(user.id);
  } catch (err) {
    return { error: toErrorPayload(err).message };
  }
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

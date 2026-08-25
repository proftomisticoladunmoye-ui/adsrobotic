'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { canAccessBusinessId, createBusinessForUser } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';
import { ACTIVE_BUSINESS_COOKIE } from '@/lib/session-cookie';

async function setActiveCookie(businessId: string) {
  const store = await cookies();
  store.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Switch the active business (validated against the user's access). */
export async function switchBusinessAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const businessId = String(formData.get('businessId') ?? '');
  if (businessId && (await canAccessBusinessId(user.id, businessId))) {
    await setActiveCookie(businessId);
  }
  redirect('/dashboard');
}

/** Create a new business under the user's organisation and switch to it. */
export async function createBusinessAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const name = String(formData.get('name') ?? '');
  const created = await createBusinessForUser(user.id, name);
  await setActiveCookie(created.id);
  redirect('/onboarding');
}

import { cache } from 'react';
import { cookies } from 'next/headers';
import { validateSession, loadActor, resolveActiveBusiness, type Actor } from '@adsrobotic/core';
import { SESSION_COOKIE, ACTIVE_BUSINESS_COOKIE } from './session-cookie';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  actor: Actor;
  activeBusiness: {
    id: string;
    name: string;
    slug: string;
    organizationId: string;
    brainStage: string;
    autonomyLevel: string;
  } | null;
}

/**
 * Resolve the authenticated user for server components / route handlers.
 * Returns null when unauthenticated; never throws on a missing session.
 * Memoized per request with React `cache()` so the layout, nav, and page share
 * one session validation instead of re-querying.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const validated = await validateSession(token);
  if (!validated) return null;

  const preferredBusinessId = store.get(ACTIVE_BUSINESS_COOKIE)?.value;
  const [actor, activeBusiness] = await Promise.all([
    loadActor(validated.user.id),
    resolveActiveBusiness(validated.user.id, preferredBusinessId),
  ]);

  return {
    id: validated.user.id,
    email: validated.user.email,
    name: validated.user.name,
    actor,
    activeBusiness,
  };
});

/** Session cookie contract shared by auth actions and the current-user reader. */
export const SESSION_COOKIE = 'ar_session';

/** Which business the user is currently working in (the switcher). */
export const ACTIVE_BUSINESS_COOKIE = 'ar_active_business';

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

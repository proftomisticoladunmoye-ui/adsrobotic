import { type NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getMetaAuthUrl, isMetaConfigured, toErrorPayload } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'ar_meta_oauth_state';

/** Start the Meta OAuth flow (Spec §21 — explicit user consent). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.activeBusiness) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (!isMetaConfigured()) {
    return NextResponse.redirect(new URL('/channels?error=not_configured', req.url));
  }

  try {
    // CSRF protection: random state bound to the business, echoed back on callback.
    const nonce = randomBytes(16).toString('hex');
    const state = `${user.activeBusiness.id}.${nonce}`;
    const res = NextResponse.redirect(getMetaAuthUrl(state));
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return res;
  } catch (err) {
    const payload = toErrorPayload(err);
    return NextResponse.redirect(new URL(`/channels?error=${payload.code}`, req.url));
  }
}

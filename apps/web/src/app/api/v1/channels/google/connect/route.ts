import { type NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getGoogleAuthUrl, isGoogleConfigured, toErrorPayload } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'ar_google_oauth_state';

/** Start the Google Ads OAuth flow (Spec §21 — explicit user consent). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.activeBusiness) return NextResponse.redirect(new URL('/login', req.url));
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL('/channels?error=not_configured', req.url));
  }

  try {
    const nonce = randomBytes(16).toString('hex');
    const state = `${user.activeBusiness.id}.${nonce}`;
    const res = NextResponse.redirect(getGoogleAuthUrl(state));
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

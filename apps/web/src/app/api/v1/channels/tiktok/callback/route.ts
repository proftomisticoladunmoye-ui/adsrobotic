import { type NextRequest, NextResponse } from 'next/server';
import { connectTikTokFromCode, toErrorPayload } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'ar_tiktok_oauth_state';

/** TikTok OAuth redirect handler: verify state, exchange the code, store the
 *  encrypted connection, and return to the channels page. TikTok returns the
 *  code as `auth_code`. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.activeBusiness) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('auth_code') ?? url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const back = (q: string) => NextResponse.redirect(new URL(`/channels?${q}`, req.url));

  if (!code || !state) return back('error=missing_code');
  if (!cookieState || cookieState !== state || !state.startsWith(`${user.activeBusiness.id}.`)) {
    return back('error=state_mismatch');
  }
  try {
    await connectTikTokFromCode(user.activeBusiness.id, code, user.id);
    const res = back('connected=tiktok');
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    return back(`error=${encodeURIComponent(toErrorPayload(err).message)}`);
  }
}

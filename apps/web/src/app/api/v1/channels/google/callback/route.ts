import { type NextRequest, NextResponse } from 'next/server';
import { connectGoogleFromCode, toErrorPayload } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'ar_google_oauth_state';

/** Google OAuth redirect handler: verify state, exchange the code, store the
 *  encrypted refresh-token connection, and return to the channels page. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.activeBusiness) return NextResponse.redirect(new URL('/login', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  const back = (q: string) => NextResponse.redirect(new URL(`/channels?${q}`, req.url));

  if (error) return back(`error=${encodeURIComponent(error)}`);
  if (!code || !state) return back('error=missing_code');
  if (!cookieState || cookieState !== state || !state.startsWith(`${user.activeBusiness.id}.`)) {
    return back('error=state_mismatch');
  }

  try {
    await connectGoogleFromCode(user.activeBusiness.id, code, user.id);
    const res = back('connected=google');
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    const payload = toErrorPayload(err);
    return back(`error=${encodeURIComponent(payload.message)}`);
  }
}

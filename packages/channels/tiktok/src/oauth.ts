/**
 * TikTok Business OAuth. The user authorises via the TikTok portal; the code is
 * exchanged for a long-lived access token plus the advertiser ids the app may
 * manage. Uses the global `fetch`.
 */
import { tiktokPost, type TikTokConfig } from './api';

const AUTH_URL = 'https://business-api.tiktok.com/portal/auth';

export function buildAuthUrl(opts: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set('app_id', opts.appId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('state', opts.state);
  return url.toString();
}

export interface TokenData {
  access_token: string;
  advertiser_ids?: string[];
  scope?: string[];
}

/** Exchange the auth code for an access token + advertiser ids. */
export function exchangeCodeForToken(
  cfg: TikTokConfig,
  opts: { appId: string; secret: string; authCode: string },
) {
  return tiktokPost<TokenData>(
    cfg,
    'oauth2/access_token/',
    { app_id: opts.appId, secret: opts.secret, auth_code: opts.authCode, grant_type: 'authorization_code' },
    '',
  );
}

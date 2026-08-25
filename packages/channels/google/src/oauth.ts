/**
 * Google OAuth 2.0 for the Google Ads API. Unlike Meta, Google issues a
 * long-lived refresh token (with `access_type=offline` + `prompt=consent`) that
 * AdsRobotic stores encrypted; short-lived access tokens are minted from it on
 * demand. Uses the global `fetch`.
 */
export const ADWORDS_SCOPE = 'https://www.googleapis.com/auth/adwords';

export interface OAuthConfig {
  /** Override token endpoint in tests. */
  tokenUrl?: string;
}

export type OAuthResult<T> = { ok: true; data: T } | { ok: false; error: string };

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export function buildAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', opts.clientId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', opts.scope ?? ADWORDS_SCOPE);
  // offline + consent are required to reliably receive a refresh token.
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', opts.state);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

async function postToken(
  cfg: OAuthConfig,
  body: Record<string, string>,
): Promise<OAuthResult<TokenResponse>> {
  try {
    const res = await fetch(cfg.tokenUrl ?? TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, error: `Non-JSON token response (${res.status})` };
    }
    if (!res.ok) {
      const e = json as { error?: string; error_description?: string };
      return { ok: false, error: e.error_description ?? e.error ?? `Token error ${res.status}` };
    }
    return { ok: true, data: json as TokenResponse };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export function exchangeCodeForToken(
  cfg: OAuthConfig,
  opts: { clientId: string; clientSecret: string; redirectUri: string; code: string },
): Promise<OAuthResult<TokenResponse>> {
  return postToken(cfg, {
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: 'authorization_code',
  });
}

export function refreshAccessToken(
  cfg: OAuthConfig,
  opts: { clientId: string; clientSecret: string; refreshToken: string },
): Promise<OAuthResult<TokenResponse>> {
  return postToken(cfg, {
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    refresh_token: opts.refreshToken,
    grant_type: 'refresh_token',
  });
}

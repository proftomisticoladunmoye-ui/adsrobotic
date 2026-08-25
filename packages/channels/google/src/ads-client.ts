/**
 * Minimal Google Ads REST client. All calls carry the developer token and a
 * bearer access token; mutating calls POST JSON. Returns a discriminated result
 * so callers verify success explicitly (Spec §27). Tokens are never logged.
 */
export const DEFAULT_ADS_VERSION = 'v18';

export interface AdsClientConfig {
  version?: string;
  developerToken: string;
  loginCustomerId?: string;
  /** Override base URL in tests. */
  baseUrl?: string;
}

export type AdsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

function base(cfg: AdsClientConfig): string {
  const version = cfg.version ?? DEFAULT_ADS_VERSION;
  return (cfg.baseUrl ?? `https://googleads.googleapis.com/${version}`).replace(/\/$/, '');
}

function headers(cfg: AdsClientConfig, accessToken: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': cfg.developerToken,
    'content-type': 'application/json',
  };
  if (cfg.loginCustomerId) h['login-customer-id'] = cfg.loginCustomerId.replace(/-/g, '');
  return h;
}

interface AdsErrorBody {
  error?: { message?: string; status?: string; details?: unknown };
}

async function parse<T>(res: Response): Promise<AdsResult<T>> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: `Non-JSON response (${res.status})`, status: res.status };
  }
  if (!res.ok) {
    const e = (body as AdsErrorBody).error;
    return { ok: false, error: e?.message ?? `Google Ads error ${res.status}`, status: res.status };
  }
  return { ok: true, data: body as T };
}

export async function adsGet<T>(
  cfg: AdsClientConfig,
  path: string,
  accessToken: string,
): Promise<AdsResult<T>> {
  try {
    const res = await fetch(`${base(cfg)}/${path.replace(/^\//, '')}`, {
      method: 'GET',
      headers: headers(cfg, accessToken),
    });
    return await parse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function adsPost<T>(
  cfg: AdsClientConfig,
  path: string,
  body: unknown,
  accessToken: string,
): Promise<AdsResult<T>> {
  try {
    const res = await fetch(`${base(cfg)}/${path.replace(/^\//, '')}`, {
      method: 'POST',
      headers: headers(cfg, accessToken),
      body: JSON.stringify(body),
    });
    return await parse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Extract the numeric id from a Google resource name like `customers/1/campaigns/2`. */
export function idFromResourceName(resourceName: string): string {
  const parts = resourceName.split('/');
  return parts[parts.length - 1] ?? resourceName;
}

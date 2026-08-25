/**
 * Thin Meta Graph API client. Uses the global `fetch` (Node ≥ 18). Every method
 * returns a discriminated result so callers can verify success explicitly and
 * never assume an action worked (Spec §27). The access token is passed per call
 * and never logged.
 */
export const DEFAULT_GRAPH_VERSION = 'v21.0';

export interface GraphConfig {
  version?: string;
  /** Override base URL in tests. */
  baseUrl?: string;
}

export type GraphResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: number; subcode?: number };

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number; type?: string };
}

function base(cfg: GraphConfig): string {
  const version = cfg.version ?? DEFAULT_GRAPH_VERSION;
  return (cfg.baseUrl ?? `https://graph.facebook.com/${version}`).replace(/\/$/, '');
}

async function parse<T>(res: Response): Promise<GraphResult<T>> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: `Non-JSON response (${res.status}): ${text.slice(0, 200)}` };
  }
  if (!res.ok) {
    const e = (body as GraphErrorBody).error;
    return {
      ok: false,
      error: e?.message ?? `Graph API error ${res.status}`,
      code: e?.code,
      subcode: e?.error_subcode,
    };
  }
  return { ok: true, data: body as T };
}

export async function graphGet<T>(
  cfg: GraphConfig,
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<GraphResult<T>> {
  const url = new URL(`${base(cfg)}/${path.replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (accessToken) url.searchParams.set('access_token', accessToken);
  try {
    const res = await fetch(url, { method: 'GET' });
    return await parse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function graphPost<T>(
  cfg: GraphConfig,
  path: string,
  body: Record<string, string>,
  accessToken: string,
): Promise<GraphResult<T>> {
  const url = `${base(cfg)}/${path.replace(/^\//, '')}`;
  const form = new URLSearchParams({ ...body, access_token: accessToken });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    return await parse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Build the OAuth authorization URL a user is redirected to. */
export function buildAuthUrl(opts: {
  appId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
  version?: string;
}): string {
  const version = opts.version ?? DEFAULT_GRAPH_VERSION;
  const scopes = opts.scopes ?? ['ads_management', 'ads_read', 'business_management'];
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set('client_id', opts.appId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('state', opts.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(','));
  return url.toString();
}

/** Exchange an OAuth `code` for a user access token. */
export async function exchangeCodeForToken(
  cfg: GraphConfig,
  opts: { appId: string; appSecret: string; redirectUri: string; code: string },
): Promise<GraphResult<{ access_token: string; token_type?: string; expires_in?: number }>> {
  return graphGet(
    cfg,
    'oauth/access_token',
    {
      client_id: opts.appId,
      client_secret: opts.appSecret,
      redirect_uri: opts.redirectUri,
      code: opts.code,
    },
    '',
  );
}

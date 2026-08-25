/**
 * Minimal TikTok Business (Marketing) API client. TikTok wraps every response in
 * `{ code, message, data, request_id }` where `code === 0` means success — so
 * even HTTP 200 can carry an API error, which we surface explicitly (Spec §27).
 * Uses the global `fetch`; the access token goes in the `Access-Token` header
 * and is never logged.
 */
export const DEFAULT_TIKTOK_VERSION = 'v1.3';

export interface TikTokConfig {
  version?: string;
  /** Override base URL in tests. */
  baseUrl?: string;
}

export type TikTokResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: number };

interface Envelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

function base(cfg: TikTokConfig): string {
  const version = cfg.version ?? DEFAULT_TIKTOK_VERSION;
  return (cfg.baseUrl ?? `https://business-api.tiktok.com/open_api/${version}`).replace(/\/$/, '');
}

async function parse<T>(res: Response): Promise<TikTokResult<T>> {
  const text = await res.text();
  let body: Envelope<T>;
  try {
    body = text ? (JSON.parse(text) as Envelope<T>) : {};
  } catch {
    return { ok: false, error: `Non-JSON response (${res.status})` };
  }
  if (!res.ok) return { ok: false, error: body.message ?? `TikTok error ${res.status}`, code: body.code };
  if (body.code !== 0) {
    return { ok: false, error: body.message ?? `TikTok API error (code ${body.code})`, code: body.code };
  }
  return { ok: true, data: (body.data ?? {}) as T };
}

export async function tiktokGet<T>(
  cfg: TikTokConfig,
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<TikTokResult<T>> {
  const url = new URL(`${base(cfg)}/${path.replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'Access-Token': accessToken } });
    return await parse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function tiktokPost<T>(
  cfg: TikTokConfig,
  path: string,
  body: unknown,
  accessToken: string,
): Promise<TikTokResult<T>> {
  try {
    const res = await fetch(`${base(cfg)}/${path.replace(/^\//, '')}`, {
      method: 'POST',
      headers: { 'Access-Token': accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await parse<T>(res);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

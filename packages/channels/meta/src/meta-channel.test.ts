import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetaChannel, mapObjective, actId } from './meta-channel';
import { buildAuthUrl } from './graph';

/** A tiny fetch stub that records requests and replays queued responses. */
function stubFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = input.toString();
    calls.push({ url, init });
    const { status, body } = handler(url, init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

describe('Meta helpers', () => {
  it('maps objectives to Meta outcomes', () => {
    expect(mapObjective('get_leads')).toBe('OUTCOME_LEADS');
    expect(mapObjective('whatsapp_messages')).toBe('OUTCOME_ENGAGEMENT');
    expect(mapObjective('unknown')).toBe('OUTCOME_TRAFFIC');
  });

  it('normalises ad account ids', () => {
    expect(actId('123')).toBe('act_123');
    expect(actId('act_123')).toBe('act_123');
  });

  it('builds an OAuth authorize URL with scopes and state', () => {
    const url = buildAuthUrl({ appId: 'APP', redirectUri: 'https://x/cb', state: 'S' });
    expect(url).toContain('client_id=APP');
    expect(url).toContain('state=S');
    expect(url).toContain('ads_management');
  });
});

describe('MetaChannel (fetch mocked)', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => vi.restoreAllMocks());

  it('refuses to act without an access token, never fabricating success', async () => {
    const ch = new MetaChannel();
    const res = await ch.createCampaign({}, { name: 'X', objective: 'get_leads' });
    expect(res.ok).toBe(false);
    expect(res.verified).toBe(false);
  });

  it('creates a PAUSED campaign and verifies by re-reading status', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('/campaigns')) return { status: 200, body: { id: 'cmp_1' } };
      // status re-read
      return { status: 200, body: { id: 'cmp_1', status: 'PAUSED' } };
    });
    const ch = new MetaChannel();
    const res = await ch.createCampaign(
      { accessToken: 'T', externalAccountId: '123' },
      { name: 'Weekend Fresh', objective: 'whatsapp_messages' },
    );
    expect(res.ok).toBe(true);
    expect(res.externalId).toBe('cmp_1');
    expect(res.verified).toBe(true);

    // POST body carried the right, PAUSED, mapped-objective campaign to act_123.
    const post = calls.find((c) => c.init?.method === 'POST')!;
    expect(post.url).toContain('act_123/campaigns');
    const body = String(post.init?.body);
    expect(body).toContain('objective=OUTCOME_ENGAGEMENT');
    expect(body).toContain('status=PAUSED');
  });

  it('pause is only verified when the re-read status matches', async () => {
    stubFetch((_url, init) => {
      if (init?.method === 'POST') return { status: 200, body: { success: true } };
      // Simulate Meta still reporting ACTIVE after the pause call.
      return { status: 200, body: { id: 'cmp_9', status: 'ACTIVE' } };
    });
    const ch = new MetaChannel();
    const res = await ch.pauseCampaign({ accessToken: 'T' }, 'cmp_9');
    expect(res.ok).toBe(true);
    expect(res.verified).toBe(false); // re-read didn't confirm PAUSED
  });

  it('surfaces Graph API errors instead of throwing', async () => {
    stubFetch(() => ({ status: 400, body: { error: { message: 'Invalid token', code: 190 } } }));
    const ch = new MetaChannel();
    const res = await ch.connectAccount({ accessToken: 'bad' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Invalid token');
  });

  it('parses insights into typed metrics', async () => {
    stubFetch(() => ({
      status: 200,
      body: {
        data: [
          {
            impressions: '48230',
            clicks: '2814',
            spend: '380.00',
            actions: [{ action_type: 'lead', value: '326' }],
          },
        ],
      },
    }));
    const ch = new MetaChannel();
    const m = await ch.getCampaignMetrics({ accessToken: 'T' }, {
      externalCampaignId: 'cmp_1',
      from: '2026-08-01',
      to: '2026-08-25',
    });
    expect(m.impressions).toBe(48230);
    expect(m.leads).toBe(326);
    expect(m.spend.amount).toBe('380.00');
    expect(m.source).toBe('actual');
  });
});

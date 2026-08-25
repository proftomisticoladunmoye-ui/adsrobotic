import { describe, it, expect, vi, afterEach } from 'vitest';
import { TikTokChannel, mapObjective } from './tiktok-channel';
import { buildAuthUrl } from './oauth';

function stubFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = input.toString();
      calls.push({ url, init });
      const { status, body } = handler(url, init);
      return new Response(JSON.stringify(body), { status });
    }),
  );
  return calls;
}

describe('TikTok helpers', () => {
  it('maps objectives', () => {
    expect(mapObjective('get_leads')).toBe('LEAD_GENERATION');
    expect(mapObjective('build_awareness')).toBe('REACH');
    expect(mapObjective('unknown')).toBe('TRAFFIC');
  });
  it('builds an auth URL', () => {
    const url = buildAuthUrl({ appId: 'APP', redirectUri: 'https://x/cb', state: 'S' });
    expect(url).toContain('app_id=APP');
    expect(url).toContain('state=S');
    expect(url).toContain('portal/auth');
  });
});

describe('TikTokChannel (fetch mocked)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refuses to act without a token, never fabricating', async () => {
    const ch = new TikTokChannel();
    const res = await ch.createCampaign({}, { name: 'X', objective: 'get_leads' });
    expect(res.ok).toBe(false);
    expect(res.verified).toBe(false);
  });

  it('creates a campaign, forces DISABLE, and verifies via status read', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('campaign/create/')) return { status: 200, body: { code: 0, data: { campaign_id: 'c1' } } };
      if (url.includes('campaign/status/update/')) return { status: 200, body: { code: 0, data: {} } };
      // campaign/get status read
      return { status: 200, body: { code: 0, data: { list: [{ campaign_id: 'c1', operation_status: 'DISABLE' }] } } };
    });
    const ch = new TikTokChannel();
    const res = await ch.createCampaign(
      { accessToken: 'T', externalAccountId: 'adv1' },
      { name: 'Weekend', objective: 'website_traffic', totalBudget: { amount: '200', currency: 'USD' } },
    );
    expect(res.ok).toBe(true);
    expect(res.externalId).toBe('c1');
    expect(res.verified).toBe(true);

    const create = calls.find((c) => c.url.includes('campaign/create/'))!;
    const body = String(create.init?.body);
    expect(body).toContain('"objective_type":"TRAFFIC"');
    expect(body).toContain('"advertiser_id":"adv1"');
    expect((create.init?.headers as Record<string, string>)['Access-Token']).toBe('T');
  });

  it('surfaces a code!==0 envelope as an error even on HTTP 200', async () => {
    stubFetch(() => ({ status: 200, body: { code: 40001, message: 'invalid advertiser' } }));
    const ch = new TikTokChannel();
    const res = await ch.connectAccount({ accessToken: 'T', externalAccountId: 'adv1' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/invalid advertiser/);
  });

  it('pause is only verified when the re-read status matches', async () => {
    stubFetch((url) => {
      if (url.includes('status/update/')) return { status: 200, body: { code: 0, data: {} } };
      return { status: 200, body: { code: 0, data: { list: [{ operation_status: 'ENABLE' }] } } };
    });
    const ch = new TikTokChannel();
    const res = await ch.pauseCampaign({ accessToken: 'T', externalAccountId: 'adv1' }, 'c1');
    expect(res.ok).toBe(true);
    expect(res.verified).toBe(false);
  });

  it('parses report metrics', async () => {
    stubFetch(() => ({
      status: 200,
      body: { code: 0, data: { list: [{ metrics: { impressions: '5000', clicks: '120', spend: '75.50', conversion: '9' } }] } },
    }));
    const ch = new TikTokChannel();
    const m = await ch.getCampaignMetrics({ accessToken: 'T', externalAccountId: 'adv1' }, {
      externalCampaignId: 'c1',
      from: '2026-08-01',
      to: '2026-08-25',
    });
    expect(m.impressions).toBe(5000);
    expect(m.clicks).toBe(120);
    expect(m.spend.amount).toBe('75.50');
    expect(m.conversions).toBe(9);
  });
});

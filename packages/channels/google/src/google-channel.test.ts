import { describe, it, expect, vi, afterEach } from 'vitest';
import { GoogleChannel, mapChannelType } from './google-channel';
import { buildAuthUrl } from './oauth';
import { idFromResourceName } from './ads-client';

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

const CONFIG = { developerToken: 'DEV', clientId: 'CID', clientSecret: 'SEC' };

describe('Google helpers', () => {
  it('maps objectives to advertising channel types', () => {
    expect(mapChannelType('get_leads')).toBe('SEARCH');
    expect(mapChannelType('build_awareness')).toBe('DISPLAY');
    expect(mapChannelType('unknown')).toBe('SEARCH');
  });

  it('extracts ids from resource names', () => {
    expect(idFromResourceName('customers/1/campaigns/42')).toBe('42');
  });

  it('builds an offline-consent auth URL', () => {
    const url = buildAuthUrl({ clientId: 'CID', redirectUri: 'https://x/cb', state: 'S' });
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('adwords');
  });
});

describe('GoogleChannel (fetch mocked)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports not-configured without a developer token, never fabricating', async () => {
    const ch = new GoogleChannel({ clientId: 'CID', clientSecret: 'SEC' });
    const res = await ch.createCampaign(
      { accessToken: 'T', externalAccountId: '123' },
      { name: 'X', objective: 'get_leads' },
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/developer token/i);
  });

  it('creates a budget then a PAUSED campaign and verifies via query', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('campaignBudgets:mutate')) {
        return { status: 200, body: { results: [{ resourceName: 'customers/123/campaignBudgets/9' }] } };
      }
      if (url.includes('campaigns:mutate')) {
        return { status: 200, body: { results: [{ resourceName: 'customers/123/campaigns/55' }] } };
      }
      // searchStream verify
      return { status: 200, body: [{ results: [{ campaign: { status: 'PAUSED' } }] }] };
    });
    const ch = new GoogleChannel(CONFIG);
    const res = await ch.createCampaign(
      { accessToken: 'T', externalAccountId: '123' },
      { name: 'Weekend', objective: 'get_leads', totalBudget: { amount: '100', currency: 'USD' } },
    );
    expect(res.ok).toBe(true);
    expect(res.externalId).toBe('55');
    expect(res.verified).toBe(true);

    const budgetCall = calls.find((c) => c.url.includes('campaignBudgets:mutate'))!;
    expect(String(budgetCall.init?.body)).toContain('"amountMicros":"100000000"');
    const campCall = calls.find((c) => c.url.includes('campaigns:mutate'))!;
    const body = String(campCall.init?.body);
    expect(body).toContain('"status":"PAUSED"');
    expect(body).toContain('"advertisingChannelType":"SEARCH"');
    // developer token header is sent
    expect((campCall.init?.headers as Record<string, string>)['developer-token']).toBe('DEV');
  });

  it('refreshes an access token when only a refresh token is present', async () => {
    const calls = stubFetch((url) => {
      if (url.includes('oauth2') || url.includes('token')) {
        return { status: 200, body: { access_token: 'fresh', expires_in: 3600 } };
      }
      return { status: 200, body: { resourceNames: ['customers/777'] } };
    });
    const ch = new GoogleChannel({ ...CONFIG, tokenUrl: 'https://token.test/token' });
    const res = await ch.connectAccount({ refreshToken: 'R' });
    expect(res.ok).toBe(true);
    expect(res.externalAccountId).toBe('777');
    expect(calls.some((c) => c.url.includes('token.test'))).toBe(true);
  });

  it('pause is only verified when the re-read status matches', async () => {
    stubFetch((url) => {
      if (url.includes('campaigns:mutate')) return { status: 200, body: { results: [{ resourceName: 'x' }] } };
      return { status: 200, body: [{ results: [{ campaign: { status: 'ENABLED' } }] }] };
    });
    const ch = new GoogleChannel(CONFIG);
    const res = await ch.pauseCampaign({ accessToken: 'T', externalAccountId: '1' }, '55');
    expect(res.ok).toBe(true);
    expect(res.verified).toBe(false);
  });

  it('parses GAQL metrics including cost_micros', async () => {
    stubFetch(() => ({
      status: 200,
      body: [
        {
          results: [
            { metrics: { impressions: '1000', clicks: '80', costMicros: '5000000', conversions: '12' } },
          ],
        },
      ],
    }));
    const ch = new GoogleChannel(CONFIG);
    const m = await ch.getCampaignMetrics({ accessToken: 'T', externalAccountId: '1' }, {
      externalCampaignId: '55',
      from: '2026-08-01',
      to: '2026-08-25',
    });
    expect(m.impressions).toBe(1000);
    expect(m.clicks).toBe(80);
    expect(m.spend.amount).toBe('5.00');
    expect(m.conversions).toBe(12);
  });

  it('surfaces Google Ads API errors instead of throwing', async () => {
    stubFetch(() => ({ status: 401, body: { error: { message: 'invalid dev token', status: 'UNAUTHENTICATED' } } }));
    const ch = new GoogleChannel(CONFIG);
    const res = await ch.connectAccount({ accessToken: 'bad', externalAccountId: '1' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/invalid dev token/);
  });
});

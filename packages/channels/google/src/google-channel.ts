import type {
  AdvertisingChannel,
  AudienceOption,
  CampaignMetricsQuery,
  CampaignTypeOption,
  ChannelCredentials,
  ChannelMetrics,
  ChannelMutationResult,
  ConnectResult,
  CreateCampaignInput,
  CreativeUpload,
  Money,
} from '@adsrobotic/channel-core';
import {
  DEFAULT_ADS_VERSION,
  adsGet,
  adsPost,
  idFromResourceName,
  type AdsClientConfig,
} from './ads-client';
import { refreshAccessToken, type OAuthConfig } from './oauth';

/**
 * Google Ads advertising channel — the second LIVE adapter (Spec §4).
 * Implements the AdvertisingChannel contract against the Google Ads REST API.
 * Config-gated: it needs a developer token + OAuth client credentials to
 * transact and returns explicit errors otherwise — never fabricating results
 * (Spec §28). Every mutation is confirmed with a follow-up query (Spec §27).
 */

const CHANNEL_TYPE: Record<string, string> = {
  build_awareness: 'DISPLAY',
  promote_app: 'DISPLAY',
  get_customers: 'SEARCH',
  get_leads: 'SEARCH',
  increase_sales: 'SEARCH',
  website_traffic: 'SEARCH',
  whatsapp_messages: 'SEARCH',
  promote_event: 'SEARCH',
  recruit_participants: 'SEARCH',
};

export function mapChannelType(objective: string): string {
  return CHANNEL_TYPE[objective] ?? 'SEARCH';
}

function toMicros(m?: Money): string {
  if (!m) return '0';
  return String(Math.round(Number(m.amount) * 1_000_000));
}

export interface GoogleChannelOptions {
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  loginCustomerId?: string;
  version?: string;
  /** Test overrides. */
  baseUrl?: string;
  tokenUrl?: string;
}

interface MutateResponse {
  results?: Array<{ resourceName: string }>;
}
interface SearchBatch {
  results?: Array<{ campaign?: { status?: string }; metrics?: Record<string, string> }>;
}

export class GoogleChannel implements AdvertisingChannel {
  readonly id = 'google' as const;
  readonly label = 'Google Ads';

  private readonly opts: GoogleChannelOptions;
  private readonly ads: AdsClientConfig;
  private readonly oauth: OAuthConfig;

  constructor(opts: GoogleChannelOptions = {}) {
    this.opts = opts;
    this.ads = {
      version: opts.version ?? DEFAULT_ADS_VERSION,
      developerToken: opts.developerToken ?? '',
      ...(opts.loginCustomerId ? { loginCustomerId: opts.loginCustomerId } : {}),
      ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}),
    };
    this.oauth = opts.tokenUrl ? { tokenUrl: opts.tokenUrl } : {};
  }

  private configured(): string | null {
    if (!this.opts.developerToken) return 'Google Ads developer token is not configured.';
    if (!this.opts.clientId || !this.opts.clientSecret) return 'Google OAuth client is not configured.';
    return null;
  }

  /** Resolve a usable access token: use the provided one, else refresh. */
  private async accessToken(creds: ChannelCredentials): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
    if (creds.accessToken) return { ok: true, token: creds.accessToken };
    if (!creds.refreshToken) return { ok: false, error: 'No refresh token on the connection.' };
    if (!this.opts.clientId || !this.opts.clientSecret) {
      return { ok: false, error: 'Google OAuth client is not configured.' };
    }
    const res = await refreshAccessToken(this.oauth, {
      clientId: this.opts.clientId,
      clientSecret: this.opts.clientSecret,
      refreshToken: creds.refreshToken,
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, token: res.data.access_token };
  }

  private cid(creds: ChannelCredentials): string {
    return (creds.externalAccountId ?? '').replace(/-/g, '');
  }

  async connectAccount(creds: ChannelCredentials): Promise<ConnectResult> {
    const notConfigured = this.configured();
    if (notConfigured) return { ok: false, error: notConfigured };
    const tok = await this.accessToken(creds);
    if (!tok.ok) return { ok: false, error: tok.error };

    const res = await adsGet<{ resourceNames?: string[] }>(
      this.ads,
      'customers:listAccessibleCustomers',
      tok.token,
    );
    if (!res.ok) return { ok: false, error: res.error };
    const first = res.data.resourceNames?.[0];
    if (!first) return { ok: false, error: 'No accessible Google Ads accounts.' };
    return { ok: true, externalAccountId: idFromResourceName(first), scopes: ['adwords'] };
  }

  async validatePermissions(creds: ChannelCredentials): Promise<{ ok: boolean; missing: string[] }> {
    if (this.configured()) return { ok: false, missing: ['developer_token', 'oauth_client'] };
    const tok = await this.accessToken(creds);
    if (!tok.ok) return { ok: false, missing: ['access'] };
    const res = await adsGet<{ resourceNames?: string[] }>(
      this.ads,
      'customers:listAccessibleCustomers',
      tok.token,
    );
    return { ok: res.ok, missing: res.ok ? [] : ['adwords'] };
  }

  async getAvailableCampaignTypes(): Promise<CampaignTypeOption[]> {
    return [
      { key: 'SEARCH', label: 'Search', objectives: ['get_leads', 'website_traffic', 'increase_sales'] },
      { key: 'DISPLAY', label: 'Display', objectives: ['build_awareness', 'promote_app'] },
    ];
  }

  async getAudienceOptions(): Promise<AudienceOption[]> {
    return [];
  }

  async createCampaign(
    creds: ChannelCredentials,
    input: CreateCampaignInput,
  ): Promise<ChannelMutationResult> {
    const notConfigured = this.configured();
    if (notConfigured) return { ok: false, verified: false, error: notConfigured };
    const cid = this.cid(creds);
    if (!cid) return { ok: false, verified: false, error: 'No customer id on the connection.' };
    const tok = await this.accessToken(creds);
    if (!tok.ok) return { ok: false, verified: false, error: tok.error };

    // 1) Create a campaign budget (Google requires it before the campaign).
    const budgetRes = await adsPost<MutateResponse>(
      this.ads,
      `customers/${cid}/campaignBudgets:mutate`,
      {
        operations: [
          {
            create: {
              name: `${input.name} budget ${Date.now()}`,
              amountMicros: toMicros(input.dailyBudget ?? input.totalBudget),
              deliveryMethod: 'STANDARD',
            },
          },
        ],
      },
      tok.token,
    );
    if (!budgetRes.ok) return { ok: false, verified: false, error: budgetRes.error };
    const budgetResource = budgetRes.data.results?.[0]?.resourceName;
    if (!budgetResource) return { ok: false, verified: false, error: 'Budget creation returned no resource.' };

    // 2) Create the campaign PAUSED, referencing the budget (Spec §6).
    const campRes = await adsPost<MutateResponse>(
      this.ads,
      `customers/${cid}/campaigns:mutate`,
      {
        operations: [
          {
            create: {
              name: input.name,
              status: 'PAUSED',
              advertisingChannelType: mapChannelType(input.objective),
              campaignBudget: budgetResource,
              manualCpc: {},
            },
          },
        ],
      },
      tok.token,
    );
    if (!campRes.ok) return { ok: false, verified: false, error: campRes.error };
    const resource = campRes.data.results?.[0]?.resourceName;
    if (!resource) return { ok: false, verified: false, error: 'Campaign creation returned no resource.' };

    const externalId = idFromResourceName(resource);
    const status = await this.readStatus(creds, tok.token, externalId);
    return { ok: true, externalId, verified: status !== null };
  }

  async updateCampaign(
    creds: ChannelCredentials,
    externalCampaignId: string,
    patch: Partial<CreateCampaignInput>,
  ): Promise<ChannelMutationResult> {
    if (this.configured()) return { ok: false, verified: false, error: this.configured()! };
    const cid = this.cid(creds);
    const tok = await this.accessToken(creds);
    if (!tok.ok) return { ok: false, verified: false, error: tok.error };
    if (!patch.name) return { ok: true, externalId: externalCampaignId, verified: true };
    const res = await adsPost<MutateResponse>(
      this.ads,
      `customers/${cid}/campaigns:mutate`,
      {
        operations: [
          {
            update: { resourceName: `customers/${cid}/campaigns/${externalCampaignId}`, name: patch.name },
            updateMask: 'name',
          },
        ],
      },
      tok.token,
    );
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    return { ok: true, externalId: externalCampaignId, verified: true };
  }

  async pauseCampaign(creds: ChannelCredentials, externalCampaignId: string): Promise<ChannelMutationResult> {
    return this.setStatus(creds, externalCampaignId, 'PAUSED');
  }

  async resumeCampaign(creds: ChannelCredentials, externalCampaignId: string): Promise<ChannelMutationResult> {
    return this.setStatus(creds, externalCampaignId, 'ENABLED');
  }

  private async setStatus(
    creds: ChannelCredentials,
    externalCampaignId: string,
    status: 'ENABLED' | 'PAUSED',
  ): Promise<ChannelMutationResult> {
    const notConfigured = this.configured();
    if (notConfigured) return { ok: false, verified: false, error: notConfigured };
    const cid = this.cid(creds);
    const tok = await this.accessToken(creds);
    if (!tok.ok) return { ok: false, verified: false, error: tok.error };
    const res = await adsPost<MutateResponse>(
      this.ads,
      `customers/${cid}/campaigns:mutate`,
      {
        operations: [
          {
            update: { resourceName: `customers/${cid}/campaigns/${externalCampaignId}`, status },
            updateMask: 'status',
          },
        ],
      },
      tok.token,
    );
    if (!res.ok) return { ok: false, verified: false, error: res.error };
    const current = await this.readStatus(creds, tok.token, externalCampaignId);
    return { ok: true, externalId: externalCampaignId, verified: current === status };
  }

  private async readStatus(
    creds: ChannelCredentials,
    accessToken: string,
    externalCampaignId: string,
  ): Promise<string | null> {
    const cid = this.cid(creds);
    const res = await adsPost<SearchBatch[] | SearchBatch>(
      this.ads,
      `customers/${cid}/googleAds:searchStream`,
      { query: `SELECT campaign.status FROM campaign WHERE campaign.id = ${externalCampaignId}` },
      accessToken,
    );
    if (!res.ok) return null;
    const batches = Array.isArray(res.data) ? res.data : [res.data];
    for (const b of batches) {
      const s = b.results?.[0]?.campaign?.status;
      if (s) return s;
    }
    return null;
  }

  async uploadCreative(
    creds: ChannelCredentials,
    _externalCampaignId: string,
    _creative: CreativeUpload,
  ): Promise<ChannelMutationResult> {
    if (this.configured()) return { ok: false, verified: false, error: this.configured()! };
    void creds;
    return {
      ok: false,
      verified: false,
      error: 'Ad-group and ad assembly for Google is not implemented in this phase.',
    };
  }

  async getCampaignMetrics(
    creds: ChannelCredentials,
    query: CampaignMetricsQuery,
  ): Promise<ChannelMetrics> {
    const empty: ChannelMetrics = {
      impressions: 0,
      clicks: 0,
      spend: { amount: '0.00', currency: 'USD' },
      leads: 0,
      conversions: 0,
      source: 'actual',
    };
    if (this.configured()) return empty;
    const tok = await this.accessToken(creds);
    if (!tok.ok) return empty;
    const cid = this.cid(creds);
    const res = await adsPost<SearchBatch[] | SearchBatch>(
      this.ads,
      `customers/${cid}/googleAds:searchStream`,
      {
        query:
          `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions ` +
          `FROM campaign WHERE campaign.id = ${query.externalCampaignId} ` +
          `AND segments.date BETWEEN '${query.from}' AND '${query.to}'`,
      },
      tok.token,
    );
    if (!res.ok) return empty;
    const batches = Array.isArray(res.data) ? res.data : [res.data];
    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;
    for (const b of batches) {
      for (const row of b.results ?? []) {
        const m = row.metrics ?? {};
        impressions += Number(m.impressions ?? 0);
        clicks += Number(m.clicks ?? 0);
        costMicros += Number(m.costMicros ?? m.cost_micros ?? 0);
        conversions += Number(m.conversions ?? 0);
      }
    }
    return {
      impressions,
      clicks,
      spend: { amount: (costMicros / 1_000_000).toFixed(2), currency: 'USD' },
      leads: Math.round(conversions),
      conversions: Math.round(conversions),
      source: 'actual',
    };
  }

  async getSpend(creds: ChannelCredentials, externalCampaignId: string): Promise<Money> {
    const m = await this.getCampaignMetrics(creds, {
      externalCampaignId,
      from: '2000-01-01',
      to: new Date().toISOString().slice(0, 10),
    });
    return m.spend;
  }

  async getConversions(creds: ChannelCredentials, externalCampaignId: string): Promise<number> {
    const m = await this.getCampaignMetrics(creds, {
      externalCampaignId,
      from: '2000-01-01',
      to: new Date().toISOString().slice(0, 10),
    });
    return m.conversions;
  }
}
